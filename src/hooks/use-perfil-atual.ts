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

/**
 * Busca, no client, o perfil do usuário autenticado (nome, e-mail, role).
 * Respeita RLS via anon key (policy "perfis: own read"). Usado nos layouts
 * (topbar + sidebars) para exibir o nome real em vez de placeholders.
 */
export function usePerfilAtual() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('perfis')
          .select('nome, email, role')
          .eq('id', user.id)
          .single()
        if (!ativo) return
        const nome = data?.nome || user.email || '—'
        setPerfil({
          nome,
          email: data?.email || user.email || '',
          role: data?.role || '',
          iniciais: iniciaisDe(nome),
        })
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => { ativo = false }
  }, [])

  return { perfil, loading }
}
