'use client'

import { use, useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Fuel, Lock, Unlock, UserPlus, UserX, UserCheck,
  Car, CreditCard, FileText, Receipt, Clock, Star,
  Users2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoEvento =
  | 'inicio_parceria' | 'contrato' | 'limite_ajustado'
  | 'abastecimento' | 'marco_abastecimento' | 'requisicao_expirada'
  | 'bloqueio_auto' | 'bloqueio_manual'
  | 'desbloqueio_credito' | 'desbloqueio_req' | 'desbloqueio_manual'
  | 'motorista_novo' | 'motorista_bloqueado' | 'motorista_reativado'
  | 'veiculo_novo' | 'veiculo_bloqueado' | 'veiculo_reativado'
  | 'faturamento_fechado'

interface Evento {
  id: string
  data: string         // 'YYYY-MM-DD'
  hora?: string
  tipo: TipoEvento
  titulo: string
  descricao: string
  ator?: string
  detalhes?: Record<string, string>
}

interface Cliente {
  id: number
  empresa: string
  cnpj: string
  cidade: string
  posto: string
  desde: string
  status: 'ativo' | 'bloqueado'
  eventos: Evento[]
}

// ─── Config visual ─────────────────────────────────────────────────────────────

type IconComp = React.ElementType
interface TipoConf { icon: IconComp; dot: string; text: string; bg: string; label: string; grupo: string }

const TIPO: Record<TipoEvento, TipoConf> = {
  inicio_parceria:     { icon: Users2,     dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Início de parceria',    grupo: 'parceria'    },
  contrato:            { icon: FileText,   dot: 'bg-indigo-500',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Contrato',             grupo: 'parceria'    },
  limite_ajustado:     { icon: CreditCard, dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100',    label: 'Ajuste de limite',     grupo: 'parceria'    },
  faturamento_fechado: { icon: Receipt,    dot: 'bg-gray-500',    text: 'text-gray-700',    bg: 'bg-gray-50 border-gray-100',        label: 'Fatura fechada',       grupo: 'parceria'    },
  abastecimento:       { icon: Fuel,       dot: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100',        label: 'Abastecimento',        grupo: 'abastec'     },
  marco_abastecimento: { icon: Star,       dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',      label: 'Marco',                grupo: 'abastec'     },
  requisicao_expirada: { icon: Clock,      dot: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50 border-red-100',          label: 'Requisição expirada',  grupo: 'abastec'     },
  bloqueio_auto:       { icon: Lock,       dot: 'bg-red-600',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200',          label: 'Bloqueio automático',  grupo: 'bloqueios'   },
  bloqueio_manual:     { icon: Lock,       dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200',          label: 'Bloqueio manual',      grupo: 'bloqueios'   },
  desbloqueio_credito: { icon: Unlock,     dot: 'bg-indigo-400',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Desbloqueio (crédito)',grupo: 'bloqueios'   },
  desbloqueio_req:     { icon: Unlock,     dot: 'bg-indigo-400',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Desbloqueio (req.)',   grupo: 'bloqueios'   },
  desbloqueio_manual:  { icon: Unlock,     dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Desbloqueio manual',   grupo: 'bloqueios'   },
  motorista_novo:      { icon: UserPlus,   dot: 'bg-sky-400',     text: 'text-sky-700',     bg: 'bg-sky-50 border-sky-100',          label: 'Novo motorista',       grupo: 'pessoas'     },
  motorista_bloqueado: { icon: UserX,      dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100',    label: 'Motorista bloqueado',  grupo: 'pessoas'     },
  motorista_reativado: { icon: UserCheck,  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Motorista reativado',  grupo: 'pessoas'     },
  veiculo_novo:        { icon: Car,        dot: 'bg-sky-400',     text: 'text-sky-700',     bg: 'bg-sky-50 border-sky-100',          label: 'Novo veículo',         grupo: 'pessoas'     },
  veiculo_bloqueado:   { icon: Car,        dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100',    label: 'Veículo bloqueado',    grupo: 'pessoas'     },
  veiculo_reativado:   { icon: Car,        dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Veículo reativado',    grupo: 'pessoas'     },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
function mesLabel(data: string) {
  const [y, m] = data.split('-')
  return `${MESES[parseInt(m) - 1]} ${y}`
}
function dataLabel(data: string) {
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y}`
}

const FILTROS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'parceria',  label: 'Parceria' },
  { id: 'abastec',   label: 'Abastecimentos' },
  { id: 'bloqueios', label: 'Bloqueios' },
  { id: 'pessoas',   label: 'Pessoas e Veículos' },
]

// ─── Componente de evento ───────────────────────────────────────────────────────

function EventoCard({ evento, isLast }: { evento: Evento; isLast: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const cfg = TIPO[evento.tipo]
  const Icon = cfg.icon
  const temDetalhes = evento.detalhes && Object.keys(evento.detalhes).length > 0

  return (
    <div className="flex gap-4">
      {/* Date */}
      <div className="w-28 text-right shrink-0 pt-1.5">
        <p className="text-xs font-medium text-gray-700">{dataLabel(evento.data)}</p>
        {evento.hora && <p className="text-[11px] text-gray-400">{evento.hora}</p>}
      </div>

      {/* Spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-8 h-8 rounded-full ${cfg.dot} flex items-center justify-center shrink-0 z-10 shadow-sm`}>
          <Icon size={14} className="text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 border rounded-xl overflow-hidden ${cfg.bg}`}>
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{evento.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{evento.descricao}</p>
              {evento.ator && (
                <p className="text-[11px] text-gray-400 mt-1">por <span className="font-medium text-gray-500">{evento.ator}</span></p>
              )}
            </div>
            {temDetalhes && (
              <button
                onClick={() => setExpandido(v => !v)}
                className="shrink-0 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
              >
                {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          {expandido && evento.detalhes && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {Object.entries(evento.detalhes).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-gray-400">{k}</p>
                  <p className="text-xs font-medium text-gray-700">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TimelineClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [ordemDesc, setOrdemDesc] = useState(true)

  useEffect(() => {
    fetch(`/api/posto/relatorios/cliente/${id}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setCliente(d.cliente))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  const eventosFiltrados = useMemo(() => {
    let lista = [...(cliente?.eventos ?? [])]
    if (filtro !== 'todos') lista = lista.filter(e => TIPO[e.tipo].grupo === filtro)
    lista.sort((a, b) => {
      const cmp = a.data.localeCompare(b.data) || (a.hora ?? '').localeCompare(b.hora ?? '')
      return ordemDesc ? -cmp : cmp
    })
    return lista
  }, [cliente, filtro, ordemDesc])

  // Group by month
  const grupos = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const e of eventosFiltrados) {
      const key = mesLabel(e.data)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
  }, [eventosFiltrados])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
        <Loader2 size={22} className="animate-spin" /> <span className="text-sm">Carregando linha do tempo…</span>
      </div>
    )
  }
  if (error || !cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-gray-400 font-medium">{error || 'Cliente não encontrado.'}</p>
        <Link href="/posto/relatorios/cliente" className="text-sm text-blue-500 hover:underline">Voltar à lista</Link>
      </div>
    )
  }

  // KPIs
  const totalBloqueios  = cliente.eventos.filter(e => e.tipo === 'bloqueio_auto' || e.tipo === 'bloqueio_manual').length
  const totalAbast      = cliente.eventos.filter(e => e.tipo === 'abastecimento' || e.tipo === 'marco_abastecimento').length
  const totalFat        = cliente.eventos.filter(e => e.tipo === 'faturamento_fechado').length
  const totalPessoas    = cliente.eventos.filter(e => ['motorista_novo','motorista_bloqueado','motorista_reativado','veiculo_novo','veiculo_bloqueado','veiculo_reativado'].includes(e.tipo)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/posto/relatorios/cliente" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={14} /> Linha do Tempo
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cliente.status === 'bloqueado' ? 'bg-red-100' : 'bg-indigo-50'}`}>
                <span className={`text-sm font-bold ${cliente.status === 'bloqueado' ? 'text-red-600' : 'text-indigo-600'}`}>
                  {cliente.empresa.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{cliente.empresa}</h1>
                  <Badge variant={cliente.status === 'bloqueado' ? 'expirado' : 'ativo'} />
                </div>
                <p className="text-xs text-gray-400">{cliente.cnpj} · {cliente.cidade} · Parceiro desde {cliente.desde}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de eventos', value: cliente.eventos.length, sub: 'desde o início', color: 'text-gray-900' },
          { label: 'Abastecimentos', value: totalAbast, sub: 'registrados', color: 'text-blue-600' },
          { label: 'Bloqueios',      value: totalBloqueios, sub: 'ao longo da parceria', color: totalBloqueios > 0 ? 'text-red-500' : 'text-gray-400' },
          { label: 'Faturas fechadas', value: totalFat, sub: `${totalPessoas} eventos de pessoas/veículos`, color: 'text-gray-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros + ordem */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtro === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOrdemDesc(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          {ordemDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {ordemDesc ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
        </button>
      </div>

      {/* Timeline */}
      {eventosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-gray-400">Nenhum evento nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grupos.map(([mes, eventos]) => (
            <div key={mes}>
              {/* Month separator */}
              <div className="flex gap-4 items-center mb-3">
                <div className="w-28" />
                <div className="w-8" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{mes}</p>
                </div>
              </div>
              {eventos.map((e, i) => (
                <EventoCard key={e.id} evento={e} isLast={i === eventos.length - 1 && mes === grupos[grupos.length - 1][0]} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
