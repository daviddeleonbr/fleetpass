'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Search, List, Map, MapPin, Star, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const MapPostos = dynamic(
  () => import('@/components/ui/map-postos').then((m) => m.MapPostos),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-sm text-gray-400">Carregando mapa…</div> }
)

interface Posto {
  id: string
  nome: string
  bandeira: string
  combustiveis: string[]
  endereco: string
  lat: number | null
  lng: number | null
  telefone: string | null
  avaliacao: number | null
  parceiro: boolean
}

export default function MarketplacePage() {
  const [view, setView] = useState<'lista' | 'mapa'>('lista')
  const [search, setSearch] = useState('')
  const [combustivelFilter, setCombustivelFilter] = useState('')
  const [bandeiraFilter, setBandeiraFilter] = useState('')

  const [postos, setPostos] = useState<Posto[]>([])
  const [bandeiras, setBandeiras] = useState<string[]>([])
  const [combustiveis, setCombustiveis] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locError, setLocError] = useState('')

  const fetchPostos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search)          params.set('search', search)
      if (combustivelFilter) params.set('combustivel', combustivelFilter)
      if (bandeiraFilter)    params.set('bandeira', bandeiraFilter)

      const res = await fetch(`/api/empresa/marketplace?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar postos.')

      setPostos(data.postos)
      if (data.bandeiras?.length)    setBandeiras(data.bandeiras)
      if (data.combustiveis?.length) setCombustiveis(data.combustiveis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar postos.')
    } finally {
      setLoading(false)
    }
  }, [search, combustivelFilter, bandeiraFilter])

  // Solicita localização do usuário ao carregar
  useEffect(() => {
    if (!navigator.geolocation) { setLocError('Geolocalização não suportada pelo navegador.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError('Localização não concedida. O mapa mostrará todos os postos.'),
    )
  }, [])

  // Carrega opções de filtro na primeira vez
  useEffect(() => {
    fetch('/api/empresa/marketplace')
      .then(r => r.json())
      .then(data => {
        if (data.bandeiras)    setBandeiras(data.bandeiras)
        if (data.combustiveis) setCombustiveis(data.combustiveis)
      })
      .catch(() => {})
  }, [])

  // Re-busca quando filtros mudam (com debounce no search)
  useEffect(() => {
    const t = setTimeout(() => fetchPostos(), search ? 350 : 0)
    return () => clearTimeout(t)
  }, [fetchPostos, search, combustivelFilter, bandeiraFilter])

  const postosMapa = postos.filter((p) => p.lat !== null && p.lng !== null) as (Posto & { lat: number; lng: number })[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500 text-sm">Encontre postos parceiros na sua região.</p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            placeholder="Buscar por nome ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={combustivelFilter}
          onChange={(e) => setCombustivelFilter(e.target.value)}
        >
          <option value="">Todos combustíveis</option>
          {combustiveis.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={bandeiraFilter}
          onChange={(e) => setBandeiraFilter(e.target.value)}
        >
          <option value="">Todas bandeiras</option>
          {bandeiras.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => setView('lista')}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              view === 'lista' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
          >
            <List size={15} /> Lista
          </button>
          <button
            onClick={() => setView('mapa')}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
              view === 'mapa' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
          >
            <Map size={15} /> Mapa
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
          <button onClick={fetchPostos} className="flex items-center gap-1 text-xs underline underline-offset-2 shrink-0">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Buscando postos…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && postos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <MapPin size={32} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum posto encontrado</p>
          <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
        </div>
      )}

      {/* List view */}
      {!loading && !error && view === 'lista' && postos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {postos.map((posto) => (
            <Card key={posto.id} padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="font-semibold text-gray-900 truncate">{posto.nome}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{posto.endereco}</span>
                  </div>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full shrink-0">
                  {posto.bandeira}
                </span>
              </div>

              {posto.avaliacao !== null && (
                <div className="flex items-center gap-1 mb-3">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-medium text-gray-700">{posto.avaliacao.toFixed(1)}</span>
                  <span className="text-xs text-gray-300 mx-1">·</span>
                  <span className="text-xs text-gray-400">{posto.combustiveis.length} combustíveis</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-4">
                {posto.combustiveis.map((c) => (
                  <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Link href={`/empresa/marketplace/${posto.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">Ver detalhes</Button>
                </Link>
                {posto.parceiro ? (
                  <Badge variant="ativo" className="self-center">Parceiro</Badge>
                ) : (
                  <Link href={`/empresa/marketplace/${posto.id}`} className="flex-1">
                    <Button size="sm" className="w-full">Solicitar Parceria</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Map view */}
      {!loading && !error && view === 'mapa' && (
        <>
          {locError && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <MapPin size={12} /> {locError}
            </p>
          )}
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 500 }}>
            <MapPostos postos={postosMapa} userLocation={userLocation} />
          </div>
        </>
      )}
    </div>
  )
}
