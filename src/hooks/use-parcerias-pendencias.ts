'use client'

import { useEffect, useState } from 'react'

export interface PendenciasParcerias {
  role?: 'empresa' | 'posto'
  total: number
  // empresa
  propostasParaRevisar?: number
  // posto
  novasSolicitacoes?: number
  negociandoCount?: number
  // ambos
  msgsNaoLidas?: number
  contratosPendentes?: number
}

export function useParceriasPendencias(): PendenciasParcerias {
  const [data, setData] = useState<PendenciasParcerias>({ total: 0 })

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const res = await fetch('/api/parcerias/pendencias', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {}
    }
    tick()
    const id = setInterval(tick, 30000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return data
}
