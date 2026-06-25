'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  UserPlus, Send, Loader2, AlertCircle, CheckCircle2, Copy, Check,
  Clock, XCircle, Mail, RotateCw, Ban, Users2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PostoOpt { id: string; nome: string; combustiveis: string[] }
interface Convite {
  id: string; posto: string; email_destino: string; cnpj_destino: string | null
  nome_empresa_sugerido: string | null; combustiveis: string[]; status: string
  expira_em: string | null; aceito_em: string | null; created_at: string; jaCadastrada: boolean
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-50 text-amber-700 border-amber-100',     icon: Clock },
  aceito:    { label: 'Aceito',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  recusado:  { label: 'Recusado',  cls: 'bg-red-50 text-red-600 border-red-100',           icon: XCircle },
  expirado:  { label: 'Expirado',  cls: 'bg-gray-100 text-gray-500 border-gray-200',       icon: Clock },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500 border-gray-200',       icon: Ban },
}

const dataBR = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

export default function ClientesPage() {
  const [tab, setTab] = useState<'convidar' | 'convites'>('convidar')
  const [postos, setPostos] = useState<PostoOpt[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  // form
  const [postoId, setPostoId] = useState('')
  const [email, setEmail] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [combSel, setCombSel] = useState<string[]>([])
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [formErro, setFormErro] = useState('')
  const [sucesso, setSucesso] = useState<{ link: string; emailEnviado: boolean } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/posto/convites')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => {
        setPostos(d.postos ?? [])
        setConvites(d.convites ?? [])
        if (!postoId && d.postos?.length) setPostoId(d.postos[0].id)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [postoId])

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const postoAtual = postos.find((p) => p.id === postoId)

  const toggleComb = (c: string) =>
    setCombSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  async function enviar() {
    if (!postoId || !email) return
    setEnviando(true); setFormErro(''); setSucesso(null)
    try {
      const res = await fetch('/api/posto/convites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postoId, email, cnpj, nomeEmpresa, combustiveis: combSel, mensagem }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao enviar convite.')
      setSucesso({ link: d.link, emailEnviado: d.emailEnviado })
      setEmail(''); setCnpj(''); setNomeEmpresa(''); setCombSel([]); setMensagem('')
      carregar()
    } catch (e) {
      setFormErro(e instanceof Error ? e.message : 'Erro ao enviar convite.')
    } finally {
      setEnviando(false)
    }
  }

  async function acaoConvite(id: string, acao: 'cancelar' | 'reenviar') {
    await fetch(`/api/posto/convites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    })
    carregar()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">Convide transportadoras para abastecerem no seu posto.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([['convidar', 'Convidar'], ['convites', `Convites${convites.length ? ` (${convites.length})` : ''}`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
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

      {erro ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-red-500">
          <AlertCircle size={16} /> {erro}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando…</span>
        </div>
      ) : postos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
          Cadastre um posto em <Link href="/posto/meus-postos" className="text-petrol-700 underline">Meus Postos</Link> para convidar clientes.
        </div>
      ) : tab === 'convidar' ? (
        // ── Formulário de convite ──────────────────────────────────────────
        <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-petrol-50 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-petrol-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Convidar transportadora</h2>
              <p className="text-xs text-gray-400">Enviamos um e-mail com o link de cadastro/aceite.</p>
            </div>
          </div>

          {sucesso ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  Convite criado.{' '}
                  {sucesso.emailEnviado ? 'E-mail enviado ao destinatário.' : 'Compartilhe o link abaixo com o cliente.'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={sucesso.link} className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600" />
                <Button
                  variant="secondary" size="sm"
                  onClick={() => { navigator.clipboard.writeText(sucesso.link); setCopiado(true); setTimeout(() => setCopiado(false), 1800) }}
                >
                  {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSucesso(null)}>Novo convite</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {postos.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto</label>
                  <select
                    value={postoId} onChange={(e) => { setPostoId(e.target.value); setCombSel([]) }}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500"
                  >
                    {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}

              <Input label="E-mail do cliente *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="financeiro@transportadora.com.br" />

              <div className="grid grid-cols-2 gap-3">
                <Input label="CNPJ (opcional)" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00"
                  helperText="Se já for cliente cadastrado, vinculamos automaticamente." />
                <Input label="Nome da empresa (opcional)" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="TransLog" />
              </div>

              {postoAtual && postoAtual.combustiveis.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Combustíveis de interesse (opcional)</label>
                  <div className="flex flex-wrap gap-2">
                    {postoAtual.combustiveis.map((c) => (
                      <button
                        key={c} type="button" onClick={() => toggleComb(c)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          combSel.includes(c) ? 'bg-petrol-600 text-white border-petrol-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem (opcional)</label>
                <textarea
                  value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={3}
                  placeholder="Olá! Gostaríamos de atender a frota de vocês no nosso posto…"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500 resize-none"
                />
              </div>

              {formErro && (
                <div className="flex items-center gap-2 text-xs text-red-600"><AlertCircle size={13} /> {formErro}</div>
              )}

              <Button onClick={enviar} isLoading={enviando} disabled={!email || enviando}>
                <Send size={14} /> Enviar convite
              </Button>
            </div>
          )}
        </div>
      ) : (
        // ── Lista de convites ──────────────────────────────────────────────
        <div className="space-y-3">
          {convites.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
              Nenhum convite enviado ainda.
            </div>
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
                    {c.email_destino} · {c.posto} · enviado {dataBR(c.created_at)}
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
