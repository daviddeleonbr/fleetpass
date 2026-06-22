'use client'

import { useState, useEffect } from 'react'
import type { Abastecimento } from '@/lib/relatorios-data'

interface PostoOpt { id: string; label: string }

/**
 * Busca os abastecimentos reais dos postos da conta (no mesmo formato que os
 * relatórios consomem) + a lista de postos para o filtro. A agregação continua
 * acontecendo no cliente, via os helpers de relatorios-data.
 */
export function useAbastecimentos() {
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([])
  const [postos, setPostos] = useState<PostoOpt[]>([{ id: 'todos', label: 'Todos os postos' }])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    fetch('/api/posto/relatorios')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => {
        if (!ativo) return
        setAbastecimentos(d.abastecimentos ?? [])
        if (d.postos?.length) setPostos(d.postos)
      })
      .catch((e) => { if (ativo) setError(e instanceof Error ? e.message : 'Erro ao carregar.') })
      .finally(() => { if (ativo) setLoading(false) })
    return () => { ativo = false }
  }, [])

  return { abastecimentos, postos, loading, error }
}
