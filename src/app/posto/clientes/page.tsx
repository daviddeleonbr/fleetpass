'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Ban,
  Mail, RotateCw, Users2, Building2, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PostoOpt { id: string; nome: string; combustiveis: string[] }
interface Resultado { id: string; nome: string; cnpj: string; cidade: string; status: string }
interface Convite {
  id: string; posto: string; email_destino: string; nome_empresa_sugerido: string | null
  status: string; expira_em: string | null; created_at: string
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-100',       icon: Clock },
  aceito:    { label: 'Aceito',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  recusado:  { label: 'Recusado',  cls: 'bg-red-50 text-red-600 border-red-100',             icon: XCircle },
  expirado:  { label: 'Expirado',  cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: Clock },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: Ban },
}
const RES_STATUS: Record<string, { label: string; cls: string }> = {
  convite:    { label: 'Convite pendente', cls: 'text-amber-600' },
  parceria:   { label: 'Já é parceiro',    cls: 'text-emerald-600' },
  negociacao: { label: 'Em negociação',    cls: 'text-blue-600' },
}
const dataBR = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

export default function ClientesPage() {
  const [tab, setTab] = useState<'convidar' | 'convites'>('convidar')
  const [postos, setPostos] = useState<PostoOpt[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [postoId, setPostoId] = useState('')

  // busca
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [convidandoId, setConvidandoId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/posto/convites')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => {
        setPostos(d.postos ?? [])
        setConvites(d.convites ?? [])
        setPostoId((cur) => cur || (d.postos?.[0]?.id ?? ''))
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // busca com debounce
  useEffect(() => {
    if (busca.trim().length < 2 || !postoId) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/posto/empresas/buscar?q=${encodeURIComponent(busca.trim())}&postoId=${postoId}`)
        .then((r) => r.json())
        .then((d) => setResultados(d.empresas ?? []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 350)
    return () => clearTimeout(t)
  }, [busca, postoId])

  async function convidar(empresaId: string) {
    setConvidandoId(empresaId); setToast('')
    try {
      const res = await fetch('/api/posto/convites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postoId, empresaId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao convidar.')
      setResultados((rs) => rs.map((r) => (r.id === empresaId ? { ...r, status: 'convite' } : r)))
      setToast(`Convite enviado para ${d.empresaNome ?? 'a transportadora'}.`)
      setTimeout(() => setToast(''), 3500)
      carregar()
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erro ao convidar.')
      setTimeout(() => setToast(''), 4500)
    } finally {
      setConvidandoId(null)
    }
  }

  async function acaoConvite(id: string, acao: 'cancelar' | 'reenviar') {
    await fetch(`/api/posto/convites/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao }),
    })
    carregar()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">Convide transportadoras já cadastradas para abastecerem no seu posto.</p>
      </div>

      <div className="flex items-center gap-2">
        {([['convidar', 'Convidar'], ['convites', `Convites${convites.length ? ` (${convites.length})` : ''}`]] as const).map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === id ? 'bg-petrol-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
        <Link href="/posto/parcerias/ativos" className="ml-auto text-sm text-petrol-700 hover:underline flex items-center gap-1.5">
          <Users2 size={15} /> Parceiros ativos
        </Link>
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-petrol-50 border border-petrol-100 text-petrol-800 text-sm rounded-xl px-3.5 py-2.5">
          <CheckCircle2 size={15} className="text-petrol-600" /> {toast}
        </div>
      )}

      {erro ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-red-500"><AlertCircle size={16} /> {erro}</div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-gray-400"><Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando…</span></div>
      ) : postos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
          Cadastre um posto em <Link href="/posto/meus-postos" className="text-petrol-700 underline">Meus Postos</Link> para convidar clientes.
        </div>
      ) : tab === 'convidar' ? (
        // ── Buscar e convidar ──────────────────────────────────────────────
        <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-petrol-50 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-petrol-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Convidar transportadora</h2>
              <p className="text-xs text-gray-400">Ela precisa já ter conta no FleetPass. Busque pelo CNPJ ou nome.</p>
            </div>
          </div>

          {postos.length > 1 && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto</label>
              <select
                value={postoId} onChange={(e) => setPostoId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500"
              >
                {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}

          {/* Busca */}
          <div className="mt-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus
              placeholder="CNPJ ou nome da transportadora…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500"
            />
            {buscando && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" />}
          </div>

          {/* Resultados */}
          <div className="mt-3 space-y-2">
            {busca.trim().length < 2 ? (
              <p className="text-xs text-gray-400 px-1 py-4 text-center">Digite o CNPJ (completo) ou o nome para buscar.</p>
            ) : !buscando && resultados.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                Nenhuma transportadora encontrada.
                <p className="text-xs mt-1">Ela já se cadastrou no FleetPass? Peça que crie a conta primeiro.</p>
              </div>
            ) : (
              resultados.map((r) => {
                const st = RES_STATUS[r.status]
                return (
                  <div key={r.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Building2 size={15} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.nome}</p>
                      <p className="text-[11px] text-gray-400 truncate">{r.cnpj} · {r.cidade}</p>
                    </div>
                    {st ? (
                      <span className={`text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                    ) : (
                      <Button size="sm" isLoading={convidandoId === r.id} disabled={!!convidandoId} onClick={() => convidar(r.id)}>
                        <UserPlus size={13} /> Convidar
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        // ── Lista de convites ──────────────────────────────────────────────
        <div className="space-y-3">
          {convites.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">Nenhum convite enviado ainda.</div>
          ) : convites.map((c) => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.pendente
            const Icon = cfg.icon
            return (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.nome_empresa_sugerido || c.email_destino}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {c.posto} · enviado {dataBR(c.created_at)}
                    {c.status === 'pendente' && c.expira_em ? ` · expira ${dataBR(c.expira_em)}` : ''}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                  <Icon size={11} /> {cfg.label}
                </span>
                {c.status === 'pendente' && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => acaoConvite(c.id, 'reenviar')}><RotateCw size={12} /> Reenviar</Button>
                    <Button variant="secondary" size="sm" className="text-red-500 border-red-100 hover:border-red-200" onClick={() => acaoConvite(c.id, 'cancelar')}><Ban size={12} /> Cancelar</Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
