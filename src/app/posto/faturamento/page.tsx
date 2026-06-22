'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, Building2, CheckCircle2, Clock, AlertCircle, DollarSign, Droplets, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'

type StatusFat = 'pendente' | 'enviado'

type Abastecimento = {
  codigo: string
  data: string
  veiculo: string
  motorista: string
  combustivel: string
  litros: number
  valor: number
}


type Faturamento = {
  id: string
  parceriaId?: string
  empresa: string
  cnpj: string
  posto: string
  ciclo: string
  descCiclo: string
  periodo: { inicio: string; fim: string }
  dataFaturamento: string
  dataPagamento: string
  abastecimentos: number
  litros: number
  valor: number
  status: StatusFat
  detalhe: Abastecimento[]
}

const STATUS_CFG: Record<StatusFat, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  pendente:  { label: 'Aguardando fechamento', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  icon: Clock },
  enviado:   { label: 'Fatura fechada',         bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',icon: CheckCircle2 },
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function PostoChip({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      <Store size={10} /> {nome}
    </span>
  )
}

function StatusChip({ status }: { status: StatusFat }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function FaturamentoCard({
  f,
  onFechar,
}: {
  f: Faturamento
  onFechar?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <PostoChip nome={f.posto} />
            <StatusChip status={f.status} />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={13} className="text-blue-600" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{f.empresa}</span>
              <span className="text-xs text-gray-400 ml-2">{f.cnpj}</span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
            <span>Período: <strong className="text-gray-700">{f.periodo.inicio} — {f.periodo.fim}</strong></span>
            <span>Fatura em: <strong className="text-gray-700">{f.dataFaturamento}</strong></span>
          </div>

          <div className="mt-1 text-xs text-gray-400 italic">{f.descCiclo}</div>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign size={14} className="text-emerald-500" />
              <span className="font-bold text-gray-900">{formatBRL(f.valor)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Droplets size={12} className="text-blue-400" />
              {f.litros} L
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <FileText size={12} className="text-gray-400" />
              {f.abastecimentos} abastecimento{f.abastecimentos !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 items-end">
          {onFechar && (
            <Button size="sm" onClick={onFechar}>
              <FileText size={13} /> Fechar faturamento
            </Button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? 'Ocultar' : 'Ver'} abastecimentos
          </button>
        </div>
      </div>

      {/* Tabela de abastecimentos expandida */}
      {open && (
        <div className="mt-4 border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Veículo</th>
                <th className="px-3 py-2 text-left font-semibold">Motorista</th>
                <th className="px-3 py-2 text-left font-semibold">Combustível</th>
                <th className="px-3 py-2 text-right font-semibold">Litros</th>
                <th className="px-3 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {f.detalhe.map((a) => (
                <tr key={a.codigo} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-gray-600">{a.codigo}</td>
                  <td className="px-3 py-2 text-gray-600">{a.data}</td>
                  <td className="px-3 py-2 text-gray-600">{a.veiculo}</td>
                  <td className="px-3 py-2 text-gray-600">{a.motorista}</td>
                  <td className="px-3 py-2 text-gray-600">{a.combustivel}</td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">{a.litros} L</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatBRL(a.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td colSpan={5} className="px-3 py-2 text-right">Total</td>
                <td className="px-3 py-2 text-right">{f.litros} L</td>
                <td className="px-3 py-2 text-right text-emerald-700">{formatBRL(f.valor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function FaturamentoPage() {
  const [tab, setTab] = useState('pendente')
  const [lista, setLista] = useState<Faturamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fecharModal, setFecharModal] = useState<Faturamento | null>(null)
  const [fechando, setFechando] = useState(false)
  const [fecharErro, setFecharErro] = useState('')
  const [detalhesPag, setDetalhesPag] = useState(1)
  const DETALHES_POR_PAG = 4

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/posto/faturamento')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setLista(d.faturamentos ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const pendentes  = lista.filter((f) => f.status === 'pendente')
  const enviados   = lista.filter((f) => f.status === 'enviado')

  const tabs = [
    { id: 'pendente',  label: 'Pendentes',   count: pendentes.length },
    { id: 'enviado',   label: 'Fechadas',    count: enviados.length },
  ]

  function abrirFecharModal(f: Faturamento) {
    setFecharModal(f)
    setFecharErro('')
    setDetalhesPag(1)
  }

  async function confirmarFechamento() {
    if (!fecharModal?.parceriaId) return
    setFechando(true)
    setFecharErro('')
    try {
      const res = await fetch('/api/posto/faturamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parceriaId: fecharModal.parceriaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao fechar faturamento.')
      setFecharModal(null)
      setTab('enviado')
      carregar()
    } catch (e) {
      setFecharErro(e instanceof Error ? e.message : 'Erro ao fechar faturamento.')
    } finally {
      setFechando(false)
    }
  }

  const totalValor = (items: Faturamento[]) => items.reduce((s, f) => s + f.valor, 0)

  const renderLista = (items: Faturamento[], status: StatusFat) => (
    <div className="space-y-4">
      {items.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-gray-400 text-center py-6">Nenhum faturamento nesta categoria.</p>
        </Card>
      )}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">{items.length} faturamento{items.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-semibold text-gray-800">Total: {formatBRL(totalValor(items))}</span>
        </div>
      )}
      {items.map((f) => (
        <FaturamentoCard
          key={f.id}
          f={f}
          onFechar={status === 'pendente' ? () => abrirFecharModal(f) : undefined}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
        <p className="text-gray-500 text-sm">Gerencie os fechamentos de abastecimentos por parceria.</p>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {error ? (
        <Card padding="md">
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-red-500">
            <AlertCircle size={16} /> {error}
          </div>
        </Card>
      ) : loading ? (
        <Card padding="md">
          <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Carregando faturamentos…</span>
          </div>
        </Card>
      ) : (
        <>
          {tab === 'pendente'  && renderLista(pendentes, 'pendente')}
          {tab === 'enviado'   && renderLista(enviados,  'enviado')}
        </>
      )}

      {/* ── Modal: Fechar faturamento ──────────────────────────── */}
      <Modal
        isOpen={fecharModal !== null}
        onClose={() => setFecharModal(null)}
        title="Fechar faturamento"
        size="md"
      >
        {fecharModal && (() => {
          const contatos: { emails: string[]; whatsapp: string[] } = { emails: [], whatsapp: [] }

          return (
            <div className="space-y-2.5 overflow-y-auto">
              {/* Cabeçalho: posto → empresa + totais inline */}
              <div className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <PostoChip nome={fecharModal.posto} />
                  <span className="text-xs text-gray-300">→</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center shrink-0">
                      <Building2 size={11} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 truncate">{fecharModal.empresa}</span>
                  </div>
                </div>
                <span className="text-base font-bold text-emerald-700 shrink-0">{formatBRL(fecharModal.valor)}</span>
              </div>

              {/* Metadados em linha única */}
              <div className="grid grid-cols-3 gap-2">
                <div className="px-2.5 py-2 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400">Período</p>
                  <p className="text-xs font-medium text-gray-800 leading-tight">{fecharModal.periodo.inicio} – {fecharModal.periodo.fim}</p>
                </div>
                <div className="px-2.5 py-2 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400">Ciclo</p>
                  <p className="text-xs font-medium text-gray-800 leading-tight">{fecharModal.ciclo}</p>
                </div>
                <div className="px-2.5 py-2 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-400">Abastecimentos</p>
                  <p className="text-xs font-bold text-gray-900">{fecharModal.abastecimentos} · {fecharModal.litros} L</p>
                </div>
              </div>

              {/* Tabela compacta com paginação */}
              {(() => {
                const total = fecharModal.detalhe.length
                const totalPags = Math.max(1, Math.ceil(total / DETALHES_POR_PAG))
                const pag = Math.min(detalhesPag, totalPags)
                const slice = fecharModal.detalhe.slice((pag - 1) * DETALHES_POR_PAG, pag * DETALHES_POR_PAG)
                return (
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                          <th className="px-2.5 py-1.5 text-left">Código</th>
                          <th className="px-2.5 py-1.5 text-left">Data</th>
                          <th className="px-2.5 py-1.5 text-left">Combustível</th>
                          <th className="px-2.5 py-1.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {slice.map((a) => (
                          <tr key={a.codigo}>
                            <td className="px-2.5 py-1.5 font-mono text-gray-500">{a.codigo}</td>
                            <td className="px-2.5 py-1.5 text-gray-500">{a.data}</td>
                            <td className="px-2.5 py-1.5 text-gray-600">{a.combustivel}</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900">{formatBRL(a.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalPags > 1 && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100 bg-gray-50">
                        <span className="text-[10px] text-gray-400">
                          {(pag - 1) * DETALHES_POR_PAG + 1}–{Math.min(pag * DETALHES_POR_PAG, total)} de {total}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetalhesPag((p) => Math.max(1, p - 1))}
                            disabled={pag === 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft size={12} className="text-gray-600" />
                          </button>
                          {Array.from({ length: totalPags }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              onClick={() => setDetalhesPag(n)}
                              className={`min-w-[20px] h-5 text-[10px] rounded transition-colors ${n === pag ? 'bg-blue-600 text-white font-medium' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setDetalhesPag((p) => Math.min(totalPags, p + 1))}
                            disabled={pag === totalPags}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight size={12} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Contatos — lado a lado */}
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-gray-100 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Mail size={11} className="text-blue-500 shrink-0" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">E-mail</p>
                  </div>
                  {contatos.emails.length === 0
                    ? <p className="text-[11px] text-gray-400 italic">Nenhum cadastrado.</p>
                    : contatos.emails.map((e) => <p key={e} className="text-[11px] text-gray-600 truncate">{e}</p>)
                  }
                </div>
                <div className="border border-gray-100 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageCircle size={11} className="text-emerald-500 shrink-0" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">WhatsApp</p>
                  </div>
                  {contatos.whatsapp.length === 0
                    ? <p className="text-[11px] text-gray-400 italic">Nenhum cadastrado.</p>
                    : contatos.whatsapp.map((w) => <p key={w} className="text-[11px] text-gray-600">{w}</p>)
                  }
                </div>
              </div>

              {/* Aviso + botões */}
              <div className="flex items-center gap-2 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                <AlertCircle size={12} className="text-blue-500 shrink-0" />
                <p className="text-[11px] text-blue-700">
                  Após confirmar, o status mudará para <strong>Fatura fechada</strong>.
                </p>
              </div>

              {fecharErro && (
                <div className="flex items-center gap-2 px-2.5 py-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600">
                  <AlertCircle size={12} className="shrink-0" /> {fecharErro}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setFecharModal(null)} disabled={fechando}>Cancelar</Button>
                <Button className="flex-1" onClick={confirmarFechamento} isLoading={fechando} disabled={fechando}>
                  <FileText size={13} /> Fechar faturamento
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

    </div>
  )
}
