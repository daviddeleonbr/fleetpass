'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Search, ChevronDown, ChevronRight, QrCode, Store, X,
  CheckCircle2, Clock, User, Fuel, Gauge, Car, MapPin,
  Calendar, AlertCircle, Lock, Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'

type Status = 'pendente' | 'ativo' | 'concluido' | 'expirado'

interface Validacao {
  dataHora: string
  frentista: string
  litros: string
  valorCobrado: string
  hodometro: string
  observacao?: string
}

interface Requisicao {
  id: string
  posto: string
  criadaEm: string
  empresa: string
  veiculo: string
  motorista: string
  combustivel: string
  limite: string
  validade: string
  status: Status
  validacao?: Validacao
}

function PostoChip({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      <Store size={10} /> {nome}
    </span>
  )
}

function ExpandedDetail({ r }: { r: Requisicao }) {
  if (r.status === 'concluido' && r.validacao) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          {/* QR code + código visível após validação */}
          <div className="flex items-center gap-4 bg-white border border-emerald-100 rounded-xl px-4 py-3 shrink-0">
            <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
              <QrCode size={28} className="text-gray-700" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Código da requisição</p>
              <p className="font-mono text-lg font-bold text-gray-900 tracking-widest">{r.id}</p>
            </div>
          </div>

          {/* Badge validado */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Abastecimento validado
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-2 mt-1">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Data e hora</p>
              <p className="text-sm font-medium text-gray-800">{r.validacao.dataHora}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Frentista</p>
              <p className="text-sm font-medium text-gray-800">{r.validacao.frentista}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Posto</p>
              <p className="text-sm font-medium text-gray-800">{r.posto}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Fuel size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Combustível</p>
              <p className="text-sm font-medium text-gray-800">{r.combustivel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Volume abastecido</p>
              <p className="text-sm font-medium text-gray-800">{r.validacao.litros}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Car size={12} className="text-gray-300 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Hodômetro</p>
              <p className="text-sm font-medium text-gray-800">{r.validacao.hodometro}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {r.validacao.observacao
            ? <p className="text-xs text-gray-400 italic">{r.validacao.observacao}</p>
            : <span />
          }
          <p className="text-base font-bold text-gray-900">{r.validacao.valorCobrado}</p>
        </div>
      </div>
    )
  }

  // Ativo / pendente / expirado — sem código nem QR
  return (
    <div className="space-y-3">
      {(r.status === 'ativo' || r.status === 'pendente') && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <Lock size={12} className="shrink-0" />
          Código e QR code disponíveis apenas após o frentista confirmar o abastecimento.
        </div>
      )}
      {r.status === 'expirado' && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={12} className="shrink-0" />
          Requisição expirada sem uso — prazo de validade encerrado.
        </div>
      )}
      <div className="grid grid-cols-4 gap-x-8 gap-y-2">
        <div className="flex items-center gap-2">
          <Fuel size={12} className="text-gray-300 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">Combustível</p>
            <p className="text-sm font-medium text-gray-700">{r.combustivel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-gray-300 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">Validade</p>
            <p className="text-sm font-medium text-gray-700">{r.validade}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User size={12} className="text-gray-300 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">Motorista</p>
            <p className="text-sm font-medium text-gray-700">{r.motorista}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Car size={12} className="text-gray-300 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">Veículo</p>
            <p className="text-sm font-medium text-gray-700">{r.veiculo}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RequisioesPostoPage() {
  const [tab, setTab] = useState('ativas')
  const [search, setSearch] = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [postos, setPostos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/posto/requisicoes')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => { setRequisicoes(d.requisicoes ?? []); setPostos(d.postos ?? []) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const ativas     = requisicoes.filter((r) => r.status === 'ativo' || r.status === 'pendente')
  const concluidas = requisicoes.filter((r) => r.status === 'concluido')
  const expiradas  = requisicoes.filter((r) => r.status === 'expirado')
  const tabData: Record<string, typeof requisicoes> = { ativas, concluidas, expiradas, todas: requisicoes }

  const tabs = [
    { id: 'ativas',     label: 'Ativas',     count: ativas.length },
    { id: 'concluidas', label: 'Concluídas', count: concluidas.length },
    { id: 'expiradas',  label: 'Expiradas',  count: expiradas.length },
    { id: 'todas',      label: 'Todas',      count: requisicoes.length },
  ]

  const currentList = useMemo(() => {
    const base = tabData[tab] || requisicoes
    const q = search.toLowerCase()
    return base.filter((r) => {
      const matchSearch = !q || r.empresa.toLowerCase().includes(q) || r.motorista.toLowerCase().includes(q)
      const matchPosto  = !filtroPosto || r.posto === filtroPosto
      return matchSearch && matchPosto
    })
  }, [tab, search, filtroPosto, requisicoes])

  const temFiltro = search !== '' || filtroPosto !== ''

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Requisições</h1>
        <p className="text-gray-500 text-sm">Requisições de abastecimento recebidas de empresas parceiras.</p>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            placeholder="Buscar por empresa ou motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filtroPosto}
            onChange={(e) => setFiltroPosto(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none cursor-pointer"
          >
            <option value="">Todos os postos</option>
            {postos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {temFiltro && (
          <button
            onClick={() => { setSearch(''); setFiltroPosto('') }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <X size={12} /> Limpar
          </button>
        )}
        <p className="text-xs text-gray-400 ml-auto">
          {currentList.length} resultado{currentList.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Card padding="none">
        {error ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-red-500">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando requisições…</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Search size={24} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {requisicoes.length === 0 ? 'Nenhuma requisição recebida ainda.' : 'Nenhuma requisição encontrada'}
            </p>
            {requisicoes.length > 0 && (
              <button onClick={() => { setSearch(''); setFiltroPosto('') }} className="text-xs text-blue-500 hover:underline mt-1">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3 w-4" />
                <th className="px-4 py-3 text-left">Posto</th>
                <th className="px-4 py-3 text-left">Criada em</th>
                <th className="px-4 py-3 text-left">Empresa</th>
                <th className="px-4 py-3 text-left">Veículo</th>
                <th className="px-4 py-3 text-left">Motorista</th>
                <th className="px-4 py-3 text-left">Combustível</th>
                <th className="px-4 py-3 text-left">Limite</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentList.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-gray-300">
                      {expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3"><PostoChip nome={r.posto} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.criadaEm}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{r.empresa}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{r.veiculo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.motorista}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.combustivel}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{r.limite}</td>
                    <td className="px-4 py-3"><Badge variant={r.status} /></td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`} className={r.status === 'concluido' ? 'bg-emerald-50/30' : 'bg-gray-50/50'}>
                      <td colSpan={9} className="px-8 py-4 border-b border-gray-100">
                        <ExpandedDetail r={r} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
