'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface PerfilAtual {
  nome: string
  email: string
  role: string
  iniciais: string
}

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '—'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Cache em memória (sessão) para DEDUPLICAR entre Topbar e Sidebar — ambos usam
// este hook em toda página autenticada. Sem o cache, cada navegação fazia 2×
// (getUser() + select perfis). Agora é uma única leitura compartilhada.
let cache: PerfilAtual | null = null
let inflight: Promise<PerfilAtual | null> | null = null

async function carregarPerfil(): Promise<PerfilAtual | null> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('perfis').select('nome, email, role').eq('id', user.id).single()
      const nome = data?.nome || user.email || '—'
      cache = {
        nome,
        email: data?.email || user.email || '',
        role: data?.role || '',
        iniciais: iniciaisDe(nome),
      }
      return cache
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Limpa o cache do perfil (usar no logout, para não vazar entre contas na mesma aba). */
export function limparPerfilAtual() {
  cache = null
  inflight = null
}

export function usePerfilAtual() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(cache)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) { setPerfil(cache); setLoading(false); return }
    let ativo = true
    carregarPerfil()
      .then((r) => { if (ativo) { setPerfil(r); setLoading(false) } })
      .catch(() => { if (ativo) setLoading(false) })
    return () => { ativo = false }
  }, [])

  return { perfil, loading }
}
