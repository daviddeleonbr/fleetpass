'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Building2, Store, ChevronRight, ChevronLeft, Send, AlertCircle, Loader2, FileSignature, MessageCircle } from 'lucide-react'
import { NegociacaoPainel } from '@/components/parcerias/negociacao-painel'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

const COMBUSTIVEIS_POSTO = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel Comum', 'Diesel S-10']
const MOTIVOS_REJEICAO = ['Volume insuficiente', 'Combustível não disponível', 'Localização inadequada', 'Capacidade indisponível', 'Outro']
const VALIDADES_PROPOSTA = ['7 dias', '15 dias', '30 dias']

type Solicitacao = {
  id: string
  posto: string
  empresa: string
  cnpj: string
  cidade: string
  veiculos: number
  combustiveis: string[]
  volume: string
  valorEstimado: string
  mensagem: string
  status: string
  created_at: string
}

type CombustivelProposta = { tipo: string; condicao: string }

type CicloFaturamento = {
  tipo: 'diario' | 'semanal' | 'quinzenal' | 'mensal'
  intervaloDias: string
  prazoRecebimento: string
}

type PropostaEnviada = Solicitacao & {
  mensagensNaoLidas?: number
  emNegociacao?: boolean
  versaoAtual?: number
  proposta: {
    combustiveis: CombustivelProposta[]
    ciclo: CicloFaturamento
    limiteCredito: string
    volumeMinimo: string
    validade: string
    observacoes: string
    enviadoEm: string
  }
}

type Aprovada = {
  id: string; posto: string; empresa: string; cnpj: string
  cidade: string; veiculos: number; combustiveis: string[]
  volume: string; aprovadoEm: string
  status: string; created_at: string
  valorEstimado: string; mensagem: string
  parceriaId: string | null
  parceriaStatus: string | null
  assinadoEmpresaEm: string | null
  assinadoPostoEm: string | null
}

type Rejeitada = {
  id: string; posto: string; empresa: string; cnpj: string
  cidade: string; veiculos: number; combustiveis: string[]
  volume: string; rejeitadoEm: string; motivo: string
  status: string; created_at: string
  valorEstimado: string; mensagem: string
}

type PropostaFormItem = {
  tipo: string
  ativo: boolean
  modalPreco: 'bomba' | 'acrescimo' | 'desconto'
  valor: string
  unidade: '%' | 'R$/L'
}

type PropostaForm = {
  combustiveis: PropostaFormItem[]
  ciclo: CicloFaturamento
  limiteCredito: string
  volumeMinimo: string
  validade: string
  observacoes: string
  exigeCertificado: boolean
  exigeContrato: boolean
}

function formatCondicao(item: PropostaFormItem): string {
  if (item.modalPreco === 'bomba') return 'Preço de bomba'
  const sinal = item.modalPreco === 'acrescimo' ? '+' : '-'
  return item.unidade === '%'
    ? `${sinal} ${item.valor}% sobre bomba`
    : `${sinal} R$ ${item.valor}/L sobre bomba`
}

function formatCiclo(ciclo: CicloFaturamento): string {
  const labels: Record<CicloFaturamento['tipo'], string> = {
    diario: `Diário (a cada ${ciclo.intervaloDias || '1'} dias)`,
    semanal: 'Semanal',
    quinzenal: 'Quinzenal',
    mensal: 'Mensal',
  }
  return `${labels[ciclo.tipo]} + ${ciclo.prazoRecebimento || '0'} dias`
}

function descCiclo(ciclo: CicloFaturamento): string {
  const p = parseInt(ciclo.prazoRecebimento) || 0
  switch (ciclo.tipo) {
    case 'diario': {
      const d = parseInt(ciclo.intervaloDias) || 1
      return `Vende por ${d} dias → fatura → vence em ${p} dias`
    }
    case 'semanal':
      return `Vende seg–dom → fatura na seg → vence em ${p} dias`
    case 'quinzenal':
      return `2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia ${15 + p}) · dias 16–último (fatura dia 01, vence dia ${String(p).padStart(2, '0')})`
    case 'mensal':
      return `Vende o mês inteiro → fatura no dia 01 → vence no dia ${String(p).padStart(2, '0')}`
  }
}

function PostoChip({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      <Store size={10} />
      {nome}
    </span>
  )
}

const STEP_LABELS = ['Revisão', 'Preços', 'Ciclo', 'Detalhes', 'Confirmação']

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
            n <= step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {n < step ? <Check size={11} /> : n}
          </div>
          {n < 5 && <div className={`h-px w-5 transition-colors ${n < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
      <span className="text-xs text-gray-400 ml-2">{STEP_LABELS[step - 1]}</span>
    </div>
  )
}

export default function SolicitacoesPage() {
  const [tab, setTab] = useState('novas')
  const [novas, setNovas] = useState<Solicitacao[]>([])
  const [aprovadas, setAprovadas] = useState<Aprovada[]>([])
  const [rejeitadas, setRejeitadas] = useState<Rejeitada[]>([])
  const [propostasEnviadas, setPropostasEnviadas] = useState<PropostaEnviada[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [propostaModal, setPropostaModal] = useState<string | null>(null)
  const [propostaStep, setPropostaStep] = useState(1)
  const [propostaForm, setPropostaForm] = useState<PropostaForm>({
    combustiveis: [],
    ciclo: { tipo: 'mensal', intervaloDias: '1', prazoRecebimento: '5' },
    limiteCredito: '',
    volumeMinimo: '',
    validade: '15 dias',
    observacoes: '',
    exigeCertificado: false,
    exigeContrato: true,
  })
  const [enviandoProposta, setEnviandoProposta] = useState(false)

  const [rejeitarModal, setRejeitarModal] = useState<string | null>(null)
  const [negociacaoModal, setNegociacaoModal] = useState<string | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [rejeitando, setRejeitando] = useState(false)

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/posto/solicitacoes')
      if (!res.ok) throw new Error(`Erro ao carregar solicitações (${res.status})`)
      const data = await res.json()
      setNovas(data.novas ?? [])
      setAprovadas(data.aprovadas ?? [])
      setRejeitadas(data.rejeitadas ?? [])
      setPropostasEnviadas(data.enviadas ?? data.propostasEnviadas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSolicitacoes()
  }, [fetchSolicitacoes])

  const solicitacaoSelecionada =
    novas.find((s) => s.id === propostaModal) ??
    propostasEnviadas.find((s) => s.id === propostaModal)
  const solicitacaoRejeitar = novas.find((s) => s.id === rejeitarModal)

  const totalMsgsNaoLidas = propostasEnviadas.reduce((s, p) => s + (p.mensagensNaoLidas ?? 0), 0)
  const tabs = [
    { id: 'novas', label: 'Novas', count: novas.length },
    {
      id: 'enviadas',
      label: totalMsgsNaoLidas > 0 ? `Propostas enviadas · ${totalMsgsNaoLidas} nova${totalMsgsNaoLidas > 1 ? 's' : ''}` : 'Propostas enviadas',
      count: propostasEnviadas.length,
    },
    { id: 'aprovadas', label: 'Aprovadas', count: aprovadas.length },
    { id: 'rejeitadas', label: 'Rejeitadas', count: rejeitadas.length },
  ]

  function abrirPropostaModal(id: string) {
    const sol = novas.find((s) => s.id === id)
    if (!sol) return
    const combustiveisForm: PropostaFormItem[] = sol.combustiveis
      .filter((c) => COMBUSTIVEIS_POSTO.includes(c))
      .map((c) => ({ tipo: c, ativo: true, modalPreco: 'bomba', valor: '', unidade: '%' }))
    setPropostaForm({
      combustiveis: combustiveisForm,
      ciclo: { tipo: 'mensal', intervaloDias: '1', prazoRecebimento: '5' },
      limiteCredito: '',
      volumeMinimo: '',
      validade: '15 dias',
      observacoes: '',
      exigeCertificado: false,
      exigeContrato: true,
    })
    setPropostaStep(1)
    setPropostaModal(id)
  }

  function abrirRevisaoProposta(id: string) {
    const sol = propostasEnviadas.find((s) => s.id === id)
    if (!sol) return
    // Pré-preenche o form com a proposta atual
    const combsEnv = sol.proposta.combustiveis
    const combustiveisForm: PropostaFormItem[] = sol.combustiveis
      .filter((c) => COMBUSTIVEIS_POSTO.includes(c))
      .map((c) => {
        // Tenta achar a condição enviada anteriormente (se existir)
        const anterior = combsEnv.find((x) => x.tipo === c)
        return {
          tipo: c,
          ativo: !!anterior,
          modalPreco: 'bomba',
          valor: '',
          unidade: '%',
          ...(anterior ? parseCondicao(anterior.condicao) : {}),
        }
      })
    setPropostaForm({
      combustiveis: combustiveisForm,
      ciclo: {
        tipo: (sol.proposta.ciclo.tipo as 'diario' | 'semanal' | 'quinzenal' | 'mensal') ?? 'mensal',
        intervaloDias: sol.proposta.ciclo.intervaloDias || '1',
        prazoRecebimento: sol.proposta.ciclo.prazoRecebimento || '5',
      },
      limiteCredito: sol.proposta.limiteCredito || '',
      volumeMinimo: sol.proposta.volumeMinimo || '',
      validade: sol.proposta.validade || '15 dias',
      observacoes: sol.proposta.observacoes || '',
      exigeCertificado: (sol.proposta as any).exigeCertificado ?? false,
      exigeContrato: (sol.proposta as any).exigeContrato ?? true,
    })
    setPropostaStep(1)
    setPropostaModal(id)
  }

  function parseCondicao(cond: string): Partial<PropostaFormItem> {
    // Ex.: "+ 5% sobre bomba" | "- R$ 0,10/L sobre bomba" | "Preço de bomba"
    if (!cond || cond.toLowerCase().includes('bomba') && !cond.includes('sobre')) {
      return { modalPreco: 'bomba' }
    }
    const sinal = cond.trim().startsWith('-') ? 'desconto' : 'acrescimo'
    const m = cond.match(/([\d.,]+)\s*(%|R\$)/i)
    const valor = m?.[1] ?? ''
    const unidade = cond.includes('%') ? '%' : 'R$/L'
    return { modalPreco: sinal as 'acrescimo' | 'desconto', valor, unidade }
  }

  function fecharPropostaModal() {
    setPropostaModal(null)
    setPropostaStep(1)
  }

  async function enviarProposta() {
    if (!solicitacaoSelecionada) return
    setEnviandoProposta(true)
    try {
      const res = await fetch(`/api/posto/solicitacoes/${solicitacaoSelecionada.id}/proposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          combustiveis: propostaForm.combustiveis
            .filter(c => c.ativo)
            .map(c => ({
              tipo: c.tipo,
              ativo: true,
              modal_preco: c.modalPreco,
              valor: c.modalPreco !== 'bomba' ? parseFloat(c.valor) || 0 : null,
              unidade: c.unidade,
            })),
          ciclo: propostaForm.ciclo,
          limiteCredito: propostaForm.limiteCredito,
          volumeMinimo: propostaForm.volumeMinimo,
          validade: propostaForm.validade,
          observacoes: propostaForm.observacoes,
          exigeCertificado: propostaForm.exigeContrato ? propostaForm.exigeCertificado : false,
          exigeContrato: propostaForm.exigeContrato,
        }),
      })
      if (!res.ok) throw new Error(`Erro ao enviar proposta (${res.status})`)
      fecharPropostaModal()
      setTab('enviadas')
      await fetchSolicitacoes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar proposta')
    } finally {
      setEnviandoProposta(false)
    }
  }

  async function confirmarRejeicao() {
    if (!solicitacaoRejeitar) return
    const motivo = motivoRejeicao === 'Outro' ? motivoOutro : motivoRejeicao
    setRejeitando(true)
    try {
      const res = await fetch(`/api/posto/solicitacoes/${solicitacaoRejeitar.id}/rejeitar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo || 'Não informado' }),
      })
      if (!res.ok) throw new Error(`Erro ao rejeitar solicitação (${res.status})`)
      setRejeitarModal(null)
      setMotivoRejeicao('')
      setMotivoOutro('')
      await fetchSolicitacoes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar solicitação')
    } finally {
      setRejeitando(false)
    }
  }

  function updateCombustivel(tipo: string, updates: Partial<PropostaFormItem>) {
    setPropostaForm((prev) => ({
      ...prev,
      combustiveis: prev.combustiveis.map((c) => c.tipo === tipo ? { ...c, ...updates } : c),
    }))
  }

  const propostaValida = propostaForm.combustiveis.some((c) =>
    c.ativo && (c.modalPreco === 'bomba' || (c.valor && parseFloat(c.valor) > 0))
  )

  const stepTitle = ['Solicitação recebida', 'Condição de preços', 'Ciclo de faturamento', 'Detalhes da proposta', 'Confirmar envio'][propostaStep - 1]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitações recebidas</h1>
        <p className="text-gray-500 text-sm">Gerencie pedidos de parceria de empresas.</p>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {/* ── Loading / Error ─────────────────────────────────────── */}
      {loading && (
        <Card padding="md">
          <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando solicitações...</span>
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card padding="md">
          <div className="flex items-center gap-2 py-4 text-red-500">
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* ── Novas ──────────────────────────────────────────────── */}
      {!loading && !error && tab === 'novas' && (
        <div className="space-y-4">
          {novas.length === 0 && (
            <Card padding="md">
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma nova solicitação no momento.</p>
            </Card>
          )}
          {novas.map((s) => (
            <Card key={s.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-3"><PostoChip nome={s.posto} /></div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{s.empresa}</h3>
                      <p className="text-xs text-gray-400">{s.cnpj}</p>
                    </div>
                  </div>
                  <div className="ml-10 space-y-1.5">
                    <p className="text-sm text-gray-500">{s.cidade} · {s.veiculos} veículos · {s.volume}</p>
                    {s.valorEstimado && <p className="text-xs font-semibold text-emerald-600">{s.valorEstimado}</p>}
                    <div className="flex flex-wrap gap-1">
                      {s.combustiveis.map((c) => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                    {s.mensagem && (
                      <p className="text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg">"{s.mensagem}"</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="danger" size="sm" onClick={() => { setRejeitarModal(s.id); setMotivoRejeicao('') }}>
                    <X size={13} /> Rejeitar
                  </Button>
                  <Button size="sm" onClick={() => abrirPropostaModal(s.id)}>
                    <Send size={13} /> Enviar proposta
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Propostas enviadas ─────────────────────────────────── */}
      {!loading && !error && tab === 'enviadas' && (
        <div className="space-y-4">
          {propostasEnviadas.length === 0 && (
            <Card padding="md">
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma proposta enviada ainda.</p>
            </Card>
          )}
          {propostasEnviadas.map((s) => (
            <Card key={s.id} padding="md" className={s.mensagensNaoLidas ? 'ring-2 ring-blue-200' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <PostoChip nome={s.posto} />
                    {s.emNegociacao ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-400 text-amber-950 border border-amber-500 px-2 py-0.5 rounded-full shadow-sm">
                        <MessageCircle size={10} /> Em negociação
                      </span>
                    ) : (
                      <Badge variant="pendente">Aguardando empresa</Badge>
                    )}
                    {(s.versaoAtual ?? 1) > 1 && (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        v{s.versaoAtual}
                      </span>
                    )}
                    {!!s.mensagensNaoLidas && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                        {s.mensagensNaoLidas} nova{s.mensagensNaoLidas > 1 ? 's' : ''} mensage{s.mensagensNaoLidas > 1 ? 'ns' : 'm'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-0.5">{s.empresa}</h3>
                  <p className="text-xs text-gray-400">{s.cnpj} · {s.cidade} · {s.veiculos} veículos · {s.volume}</p>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Proposta enviada</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.proposta.combustiveis.map((c) => (
                        <span key={c.tipo} className="text-xs bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                          {c.tipo} — {c.condicao}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-700">
                      <span>Faturamento: <strong>{formatCiclo(s.proposta.ciclo)}</strong></span>
                      {s.proposta.volumeMinimo && <span>Vol. mín.: <strong>{s.proposta.volumeMinimo} L/mês</strong></span>}
                      {s.proposta.limiteCredito && <span>Limite: <strong>R$ {s.proposta.limiteCredito}</strong></span>}
                      <span>Válida por: <strong>{s.proposta.validade}</strong></span>
                    </div>
                    {s.proposta.observacoes && (
                      <p className="text-xs text-blue-600 italic">"{s.proposta.observacoes}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-xs text-gray-400 mt-1">Enviado em {s.proposta.enviadoEm}</p>
                  <Button
                    size="sm"
                    variant={s.mensagensNaoLidas ? 'primary' : 'secondary'}
                    onClick={() => setNegociacaoModal(s.id)}
                  >
                    <MessageCircle size={13} />
                    {s.mensagensNaoLidas ? 'Ver mensagem' : 'Negociar'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Aprovadas ──────────────────────────────────────────── */}
      {!loading && !error && tab === 'aprovadas' && (
        <div className="space-y-4">
          {aprovadas.length === 0 && (
            <Card padding="md">
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma proposta aprovada ainda.</p>
            </Card>
          )}
          {aprovadas.map((s) => {
            const pendente = s.parceriaStatus === 'pendente_assinatura'
            const ativa    = s.parceriaStatus === 'ativa'
            const postoAssinou   = !!s.assinadoPostoEm
            const empresaAssinou = !!s.assinadoEmpresaEm
            return (
              <Card key={s.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <PostoChip nome={s.posto} />
                      {ativa    && <Badge variant="ativo" />}
                      {pendente && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          Aguardando assinaturas
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-0.5">{s.empresa}</h3>
                    <p className="text-xs text-gray-400">{s.cnpj} · {s.cidade}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {s.combustiveis.map((c) => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>

                    {/* Status de assinaturas */}
                    {(pendente || ativa) && (
                      <div className="mt-3 flex gap-4 text-xs">
                        <span className={empresaAssinou ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                          {empresaAssinou ? '✓ Empresa assinou' : '○ Empresa pendente'}
                        </span>
                        <span className={postoAssinou ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                          {postoAssinou ? '✓ Posto assinou' : '○ Posto pendente'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xs text-gray-400">Aprovado em {s.aprovadoEm}</p>
                    {pendente && !postoAssinou && s.parceriaId && (
                      <Link href={`/posto/parcerias/ativos/${s.parceriaId}`}>
                        <Button size="sm">
                          <FileSignature size={13} /> Assinar contrato
                        </Button>
                      </Link>
                    )}
                    {pendente && postoAssinou && !empresaAssinou && (
                      <span className="text-xs text-amber-600 font-medium">Aguardando empresa</span>
                    )}
                    {ativa && s.parceriaId && (
                      <Link href={`/posto/parcerias/ativos/${s.parceriaId}`}>
                        <Button size="sm" variant="secondary">Ver contrato</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Rejeitadas ─────────────────────────────────────────── */}
      {!loading && !error && tab === 'rejeitadas' && (
        <div className="space-y-4">
          {rejeitadas.map((s) => (
            <Card key={s.id} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2"><PostoChip nome={s.posto} /></div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{s.empresa}</h3>
                    <Badge variant="rejeitado" />
                  </div>
                  <p className="text-xs text-gray-400">{s.cnpj} · {s.cidade}</p>
                  <p className="text-xs text-red-400 mt-1">Motivo: {s.motivo}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">Rejeitado em {s.rejeitadoEm}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal: Enviar Proposta (5 etapas) ──────────────────── */}
      <Modal
        isOpen={propostaModal !== null}
        onClose={fecharPropostaModal}
        title={stepTitle}
        size="lg"
      >
        {solicitacaoSelecionada && (
          <div className="space-y-5">
            <StepIndicator step={propostaStep} />

            {/* Etapa 1 — Revisão da solicitação */}
            {propostaStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <PostoChip nome={solicitacaoSelecionada.posto} />
                  <span className="text-xs text-gray-400">←</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                      <Building2 size={12} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{solicitacaoSelecionada.empresa}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">CNPJ</p>
                    <p className="text-sm font-medium text-gray-800">{solicitacaoSelecionada.cnpj}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Localização</p>
                    <p className="text-sm font-medium text-gray-800">{solicitacaoSelecionada.cidade}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Frota</p>
                    <p className="text-sm font-bold text-gray-900">{solicitacaoSelecionada.veiculos} veículos</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Volume estimado</p>
                    <p className="text-sm font-bold text-gray-900">{solicitacaoSelecionada.volume}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Receita estimada</p>
                    <p className="text-lg font-bold text-emerald-700">{solicitacaoSelecionada.valorEstimado}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Combustíveis solicitados</p>
                  <div className="flex flex-wrap gap-2">
                    {solicitacaoSelecionada.combustiveis.map((c) => (
                      <span key={c} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{c}</span>
                    ))}
                  </div>
                </div>

                {solicitacaoSelecionada.mensagem && (
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-300">
                    <p className="text-xs text-gray-400 mb-1">Mensagem da empresa</p>
                    <p className="text-sm text-gray-600 italic">"{solicitacaoSelecionada.mensagem}"</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={fecharPropostaModal}>Cancelar</Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(2)}>
                    Definir preços <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 2 — Condição de preços */}
            {propostaStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Combustíveis ofertados e condição de preço</p>
                  <p className="text-xs text-gray-400 mb-3">Defina se o cliente pagará o preço de bomba, com acréscimo ou desconto.</p>
                  <div className="space-y-3">
                    {propostaForm.combustiveis.map((c) => (
                      <div key={c.tipo} className={`p-3 border rounded-lg transition-colors ${c.ativo ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={c.ativo}
                            onChange={(e) => updateCombustivel(c.tipo, { ativo: e.target.checked })}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-gray-700">{c.tipo}</span>
                        </div>
                        {c.ativo && (
                          <div className="ml-6 space-y-2">
                            <div className="flex gap-4">
                              {(['bomba', 'acrescimo', 'desconto'] as const).map((mode) => (
                                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`modal-${c.tipo}`}
                                    checked={c.modalPreco === mode}
                                    onChange={() => updateCombustivel(c.tipo, { modalPreco: mode, valor: '' })}
                                    className="accent-blue-600"
                                  />
                                  <span className="text-sm text-gray-600">
                                    {mode === 'bomba' ? 'Preço de bomba' : mode === 'acrescimo' ? 'Acréscimo' : 'Desconto'}
                                  </span>
                                </label>
                              ))}
                            </div>
                            {c.modalPreco !== 'bomba' && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-500">{c.modalPreco === 'acrescimo' ? '+' : '-'}</span>
                                <input
                                  type="number" step="0.01" min="0" placeholder="0"
                                  value={c.valor}
                                  onChange={(e) => updateCombustivel(c.tipo, { valor: e.target.value })}
                                  className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                />
                                <select
                                  value={c.unidade}
                                  onChange={(e) => updateCombustivel(c.tipo, { unidade: e.target.value as '%' | 'R$/L' })}
                                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                >
                                  <option value="%">%</option>
                                  <option value="R$/L">R$/L</option>
                                </select>
                                <span className="text-xs text-gray-400">sobre o preço de bomba</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!propostaValida && (
                      <p className="text-xs text-amber-600 mt-1">Ative pelo menos um combustível para continuar.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(1)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(3)} disabled={!propostaValida}>
                    Definir ciclo <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 3 — Ciclo de faturamento */}
            {propostaStep === 3 && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Ciclo de faturamento</p>
                  <div className="space-y-2">
                    {([
                      { val: 'diario', label: 'Diário' },
                      { val: 'semanal', label: 'Semanal' },
                      { val: 'quinzenal', label: 'Quinzenal' },
                      { val: 'mensal', label: 'Mensal' },
                    ] as { val: CicloFaturamento['tipo']; label: string }[]).map(({ val, label }) => (
                      <div key={val}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="ciclo-tipo-sol"
                            checked={propostaForm.ciclo.tipo === val}
                            onChange={() => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, tipo: val } }))}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-700 w-20">{label}</span>
                          {val === 'diario' && propostaForm.ciclo.tipo === 'diario' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">a cada</span>
                              <input
                                type="number" min="1" max="30"
                                value={propostaForm.ciclo.intervaloDias}
                                onChange={(e) => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, intervaloDias: e.target.value } }))}
                                className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-xs text-gray-400">dias</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-700 shrink-0">Prazo de vencimento</span>
                    <input
                      type="number" min="1" max="90"
                      value={propostaForm.ciclo.prazoRecebimento}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, ciclo: { ...p.ciclo, prazoRecebimento: e.target.value } }))}
                      className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-center"
                    />
                    <span className="text-sm text-gray-500">dias (contando o dia do faturamento)</span>
                  </div>

                  {propostaForm.ciclo.prazoRecebimento && (
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                      <span className="font-semibold">Exemplo: </span>{descCiclo(propostaForm.ciclo)}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(2)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(4)}>
                    Detalhes da proposta <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 4 — Detalhes adicionais */}
            {propostaStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Validade da proposta</label>
                    <select
                      value={propostaForm.validade}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, validade: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    >
                      {VALIDADES_PROPOSTA.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div />
                  <div>
                    <Input
                      label="Volume mínimo mensal (L)"
                      type="number"
                      placeholder="Ex: 1000"
                      value={propostaForm.volumeMinimo}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, volumeMinimo: e.target.value }))}
                      helperText="Opcional"
                    />
                  </div>
                  <div>
                    <Input
                      label="Limite de crédito mensal (R$)"
                      type="number"
                      placeholder="Ex: 20000"
                      value={propostaForm.limiteCredito}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, limiteCredito: e.target.value }))}
                      helperText="Opcional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Condições especiais, horários de atendimento, instruções para motoristas..."
                    value={propostaForm.observacoes}
                    onChange={(e) => setPropostaForm((p) => ({ ...p, observacoes: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
                  />
                </div>

                {/* Toggle: exigir contrato assinado */}
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propostaForm.exigeContrato}
                      onChange={(e) => setPropostaForm((p) => ({ ...p, exigeContrato: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-petrol-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Exigir contrato assinado</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {propostaForm.exigeContrato
                          ? 'Ao aceitar, ambas as partes assinam um contrato antes da parceria ficar ativa.'
                          : 'Sem contrato: ao aceitar a proposta, a parceria é ativada imediatamente.'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Toggle: exigir certificado digital (só quando há contrato) */}
                {propostaForm.exigeContrato && (
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={propostaForm.exigeCertificado}
                        onChange={(e) => setPropostaForm((p) => ({ ...p, exigeCertificado: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-blue-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">Exigir assinatura com certificado digital (A1)</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {propostaForm.exigeCertificado
                            ? 'A empresa precisará assinar o contrato com um certificado digital ICP-Brasil válido (CNPJ deve bater com o cadastro).'
                            : 'A empresa assinará com um clique de consentimento, da mesma forma que o posto — o sistema registrará IP, dispositivo e hash do documento como evidência.'}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(3)}>
                    <ChevronLeft size={14} /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => setPropostaStep(5)}>
                    Revisar proposta <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Etapa 5 — Confirmar envio */}
            {propostaStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl space-y-3 border border-blue-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                    <PostoChip nome={solicitacaoSelecionada.posto} />
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm font-semibold text-gray-800">{solicitacaoSelecionada.empresa}</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Combustíveis e condição de preço</p>
                    <div className="space-y-1.5">
                      {propostaForm.combustiveis.filter((c) => c.ativo).map((c) => (
                        <div key={c.tipo} className="flex justify-between text-sm">
                          <span className="text-gray-600">{c.tipo}</span>
                          <span className="font-semibold text-gray-900">{formatCondicao(c)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ciclo de faturamento</span>
                      <span className="font-medium text-gray-800">{formatCiclo(propostaForm.ciclo)}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-right">{descCiclo(propostaForm.ciclo)}</div>
                    {propostaForm.volumeMinimo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Volume mínimo</span>
                        <span className="font-medium text-gray-800">{propostaForm.volumeMinimo} L/mês</span>
                      </div>
                    )}
                    {propostaForm.limiteCredito && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Limite de crédito</span>
                        <span className="font-medium text-gray-800">R$ {propostaForm.limiteCredito}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Validade da proposta</span>
                      <span className="font-medium text-gray-800">{propostaForm.validade}</span>
                    </div>
                    {propostaForm.observacoes && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-0.5">Observações</p>
                        <p className="text-xs text-gray-600 italic">"{propostaForm.observacoes}"</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    A empresa terá <strong>{propostaForm.validade}</strong> para aceitar ou recusar. Após aceite, ambas as partes deverão assinar o contrato digital para a parceria ser ativada.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" onClick={() => setPropostaStep(4)} disabled={enviandoProposta}>
                    <ChevronLeft size={14} /> Editar
                  </Button>
                  <Button className="flex-1" onClick={enviarProposta} disabled={enviandoProposta}>
                    {enviandoProposta ? (
                      <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><Send size={14} /> Enviar proposta</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Rejeitar ────────────────────────────────────── */}
      <Modal isOpen={rejeitarModal !== null} onClose={() => setRejeitarModal(null)} title="Rejeitar solicitação" size="sm">
        <div className="space-y-4">
          {solicitacaoRejeitar && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-800">{solicitacaoRejeitar.empresa}</p>
              <p className="text-xs text-gray-400">{solicitacaoRejeitar.cnpj} · {solicitacaoRejeitar.cidade}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da rejeição</label>
            <div className="space-y-2">
              {MOTIVOS_REJEICAO.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    checked={motivoRejeicao === m}
                    onChange={() => setMotivoRejeicao(m)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{m}</span>
                </label>
              ))}
            </div>
            {motivoRejeicao === 'Outro' && (
              <textarea
                rows={2}
                placeholder="Descreva o motivo..."
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
              />
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setRejeitarModal(null)} disabled={rejeitando}>Cancelar</Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmarRejeicao}
              disabled={rejeitando || !motivoRejeicao || (motivoRejeicao === 'Outro' && !motivoOutro)}
            >
              {rejeitando ? (
                <><Loader2 size={13} className="animate-spin" /> Rejeitando...</>
              ) : (
                <><X size={13} /> Confirmar rejeição</>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Negociação ───────────────────────────────────── */}
      <Modal
        isOpen={negociacaoModal !== null}
        onClose={() => setNegociacaoModal(null)}
        title="Negociação com a empresa"
        size="lg"
      >
        {negociacaoModal && (
          <NegociacaoPainel
            solicitacaoId={negociacaoModal}
            onRevisarProposta={() => {
              const sid = negociacaoModal
              setNegociacaoModal(null)
              if (sid) abrirRevisaoProposta(sid)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
