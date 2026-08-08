'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  descricao: string | null
  link: string | null
  lida_em: string | null
  created_at: string
}

export function useNotificacoes() {
  const [items, setItems] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items ?? [])
      setNaoLidas(data.naoLidas ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    refresh()
    // Polling leve (2 min) + refetch ao focar a aba — evita carga ociosa a cada 30s.
    const id = setInterval(refresh, 120000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const marcarLida = useCallback(async (id: string) => {
    await fetch('/api/notificacoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.map(n => n.id === id ? { ...n, lida_em: new Date().toISOString() } : n))
    setNaoLidas(n => Math.max(0, n - 1))
  }, [])

  const marcarTodasLidas = useCallback(async () => {
    await fetch('/api/notificacoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todas: true }),
    })
    setItems(prev => prev.map(n => n.lida_em ? n : { ...n, lida_em: new Date().toISOString() }))
    setNaoLidas(0)
  }, [])

  return { items, naoLidas, refresh, marcarLida, marcarTodasLidas }
}
