'use client'

import { useState } from 'react'
import { Store, Building2, CheckCircle2, Clock, AlertCircle, DollarSign, Droplets, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Mail, MessageCircle } from 'lucide-react'
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

const MOCK: Faturamento[] = [
  {
    id: 'fat-001',
    empresa: 'TransLog Transportes',
    cnpj: '00.000.000/0001-00',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    descCiclo: 'Vende o mês inteiro → fatura no dia 01 → vence no dia 05',
    periodo: { inicio: '01/02/2026', fim: '28/02/2026' },
    dataFaturamento: '01/03/2026',
    dataPagamento: '05/03/2026',
    abastecimentos: 5,
    litros: 293,
    valor: 1865.27,
    status: 'enviado',
    detalhe: [
      { codigo: 'FL-BB2-2B1', data: '02/02/2026', veiculo: 'JKL-3456', motorista: 'Rafael Melo',   combustivel: 'Diesel S-10',    litros: 72, valor: 455.04 },
      { codigo: 'FL-BB2-2B5', data: '14/02/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10',    litros: 48, valor: 303.36 },
      { codigo: 'FL-BB2-2B9', data: '27/02/2026', veiculo: 'GHI-9012', motorista: 'Carlos Santos', combustivel: 'Gasolina Comum', litros: 33, valor: 181.83 },
      { codigo: 'FL-BB2-2B8', data: '25/02/2026', veiculo: 'CAL-6789', motorista: 'Marcos Lima',   combustivel: 'Diesel Comum',   litros: 48, valor: 276.00 },
      { codigo: 'FL-BB2-2B3', data: '10/02/2026', veiculo: 'CAL-5678', motorista: 'Pedro Gomes',   combustivel: 'Gasolina Comum', litros: 32, valor: 176.32 },
    ],
  },
  {
    id: 'fat-002',
    empresa: 'Construtora Alpha',
    cnpj: '22.222.222/0001-22',
    posto: 'Shell — Centro',
    ciclo: 'Semanal + 5 dias',
    descCiclo: 'Vende de seg a dom → fatura na seg → paga em 5 dias',
    periodo: { inicio: '09/03/2026', fim: '15/03/2026' },
    dataFaturamento: '16/03/2026',
    dataPagamento: '21/03/2026',
    abastecimentos: 3,
    litros: 98,
    valor: 549.08,
    status: 'pendente',
    detalhe: [
      { codigo: 'FL-RN2-7P1', data: '03/03/2026', veiculo: 'CAL-5678', motorista: 'Pedro Gomes',  combustivel: 'Gasolina Comum', litros: 35, valor: 194.95 },
      { codigo: 'FL-SX9-0G5', data: '05/03/2026', veiculo: 'CAL-5678', motorista: 'Pedro Gomes',  combustivel: 'Gasolina Comum', litros: 28, valor: 155.96 },
      { codigo: 'FL-BB2-2B3', data: '10/02/2026', veiculo: 'CAL-6789', motorista: 'Marcos Lima',  combustivel: 'Diesel Comum',   litros: 35, valor: 198.17 },
    ],
  },
  {
    id: 'fat-003',
    empresa: 'Turbo Fretes',
    cnpj: '33.333.333/0001-33',
    posto: 'Shell — Norte',
    ciclo: 'Diário (a cada 2 dias) + 2 dias',
    descCiclo: 'Vende por 2 dias → fatura → paga em 2 dias',
    periodo: { inicio: '11/03/2026', fim: '12/03/2026' },
    dataFaturamento: '13/03/2026',
    dataPagamento: '15/03/2026',
    abastecimentos: 1,
    litros: 25,
    valor: 139.25,
    status: 'pendente',
    detalhe: [
      { codigo: 'FL-GF3-5J8', data: '07/03/2026', veiculo: 'TFR-8901', motorista: 'Claudia Sousa', combustivel: 'Gasolina Comum', litros: 25, valor: 139.25 },
    ],
  },
  {
    id: 'fat-007',
    empresa: 'TransLog Transportes',
    cnpj: '00.000.000/0001-00',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    descCiclo: 'Vende o mês inteiro → fatura no dia 01 → vence no dia 05',
    periodo: { inicio: '01/03/2026', fim: '31/03/2026' },
    dataFaturamento: '01/04/2026',
    dataPagamento: '05/04/2026',
    abastecimentos: 11,
    litros: 684,
    valor: 4318.90,
    status: 'pendente',
    detalhe: [
      { codigo: 'FL-CC1-1C1', data: '01/03/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10',    litros: 65, valor: 411.45 },
      { codigo: 'FL-CC1-1C2', data: '03/03/2026', veiculo: 'GHI-9012', motorista: 'Rafael Melo',   combustivel: 'Diesel S-10',    litros: 58, valor: 366.66 },
      { codigo: 'FL-CC1-1C3', data: '05/03/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',     combustivel: 'Gasolina Comum', litros: 40, valor: 222.80 },
      { codigo: 'FL-CC1-1C4', data: '07/03/2026', veiculo: 'JKL-3456', motorista: 'Marcos Lima',   combustivel: 'Diesel S-10',    litros: 72, valor: 455.04 },
      { codigo: 'FL-CC1-1C5', data: '10/03/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10',    litros: 55, valor: 347.60 },
      { codigo: 'FL-CC1-1C6', data: '13/03/2026', veiculo: 'GHI-9012', motorista: 'Rafael Melo',   combustivel: 'Gasolina Comum', litros: 38, valor: 211.66 },
      { codigo: 'FL-CC1-1C7', data: '15/03/2026', veiculo: 'CAL-5678', motorista: 'Pedro Gomes',   combustivel: 'Diesel S-10',    litros: 80, valor: 505.60 },
      { codigo: 'FL-CC1-1C8', data: '18/03/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',     combustivel: 'Diesel S-10',    litros: 62, valor: 391.82 },
      { codigo: 'FL-CC1-1C9', data: '21/03/2026', veiculo: 'JKL-3456', motorista: 'Marcos Lima',   combustivel: 'Gasolina Comum', litros: 45, valor: 250.65 },
      { codigo: 'FL-CC1-2C0', data: '25/03/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10',    litros: 70, valor: 442.40 },
      { codigo: 'FL-CC1-2C1', data: '29/03/2026', veiculo: 'GHI-9012', motorista: 'Rafael Melo',   combustivel: 'Diesel Comum',   litros: 99, valor: 713.22 },
    ],
  },
  {
    id: 'fat-004',
    empresa: 'LogBR Express',
    cnpj: '11.111.111/0001-11',
    posto: 'Shell — Norte',
    ciclo: 'Quinzenal + 7 dias',
    descCiclo: '2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia 22) · dias 16–último (fatura dia 01, vence dia 07)',
    periodo: { inicio: '01/03/2026', fim: '15/03/2026' },
    dataFaturamento: '16/03/2026',
    dataPagamento: '22/03/2026',
    abastecimentos: 3,
    litros: 190,
    valor: 1214.61,
    status: 'enviado',
    detalhe: [
      { codigo: 'FL-XK9-3P2', data: '01/03/2026', veiculo: 'LBR-9999', motorista: 'Sandro Mota',    combustivel: 'Diesel S-10', litros: 65, valor: 415.35 },
      { codigo: 'FL-HJ8-6M3', data: '03/03/2026', veiculo: 'LBR-5566', motorista: 'Diego Pires',    combustivel: 'Diesel S-10', litros: 55, valor: 351.45 },
      { codigo: 'FL-BB2-2B7', data: '07/03/2026', veiculo: 'LBR-1234', motorista: 'Fernanda Ramos', combustivel: 'Diesel S-10', litros: 70, valor: 447.81 },
    ],
  },
  {
    id: 'fat-005',
    empresa: 'TransLog Transportes',
    cnpj: '00.000.000/0001-00',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    descCiclo: 'Vende o mês inteiro → fatura no dia 01 → vence no dia 05',
    periodo: { inicio: '01/01/2026', fim: '31/01/2026' },
    dataFaturamento: '01/02/2026',
    dataPagamento: '05/02/2026',
    abastecimentos: 3,
    litros: 178,
    valor: 1112.50,
    status: 'enviado',
    detalhe: [
      { codigo: 'FL-AA1-1A1', data: '03/01/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10', litros: 50, valor: 312.50 },
      { codigo: 'FL-AA1-1A4', data: '14/01/2026', veiculo: 'GHI-9012', motorista: 'Carlos Santos', combustivel: 'Diesel S-10', litros: 60, valor: 375.00 },
      { codigo: 'FL-AA1-1A8', data: '28/01/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',     combustivel: 'Diesel S-10', litros: 68, valor: 425.00 },
    ],
  },
  {
    id: 'fat-006',
    empresa: 'TransRota Logística',
    cnpj: '44.444.444/0001-44',
    posto: 'Shell — Norte',
    ciclo: 'Quinzenal + 7 dias',
    descCiclo: '2 ciclos/mês: dias 01–15 (fatura dia 16, vence dia 22) · dias 16–último (fatura dia 01, vence dia 07)',
    periodo: { inicio: '16/01/2026', fim: '31/01/2026' },
    dataFaturamento: '01/02/2026',
    dataPagamento: '07/02/2026',
    abastecimentos: 2,
    litros: 94,
    valor: 793.25,
    status: 'enviado',
    detalhe: [
      { codigo: 'FL-BB2-2B6', data: '18/02/2026', veiculo: 'TRL-9988', motorista: 'Robson Freitas',  combustivel: 'Gasolina Aditivada', litros: 36, valor: 217.80 },
      { codigo: 'FL-AA1-1A6', data: '21/01/2026', veiculo: 'TRL-2345', motorista: 'João Batista',   combustivel: 'Diesel S-10',        litros: 58, valor: 575.45 },
    ],
  },
]

// Contatos de faturamento por empresa (espelha os dados do contrato)
// Contatos por empresa para envio de fatura
const CONTATOS_EMPRESA: Record<string, { emails: string[]; whatsapp: string[] }> = {
  'TransLog Transportes': { emails: ['financeiro@translog.com.br', 'contabilidade@translog.com.br'], whatsapp: ['+55 11 99999-0001', '+55 11 98888-0002'] },
  'LogBR Express':        { emails: ['financeiro@logbr.com.br'],                                     whatsapp: ['+55 11 97777-0003'] },
  'Construtora Alpha':    { emails: ['adm@construtoraalpha.com.br', 'pagamentos@construtoraalpha.com.br'], whatsapp: ['+55 11 96666-0004'] },
  'Turbo Fretes':         { emails: ['contas@turbofretes.com.br'],                                   whatsapp: ['+55 11 95555-0005', '+55 11 94444-0006'] },
  'TransRota Logística':  { emails: ['financeiro@transrota.com.br'],                                 whatsapp: ['+55 11 93333-0007'] },
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
  const [lista, setLista] = useState<Faturamento[]>(MOCK)
  const [fecharModal, setFecharModal] = useState<Faturamento | null>(null)
  const [detalhesPag, setDetalhesPag] = useState(1)
  const DETALHES_POR_PAG = 4

  const pendentes  = lista.filter((f) => f.status === 'pendente')
  const enviados   = lista.filter((f) => f.status === 'enviado')

  const tabs = [
    { id: 'pendente',  label: 'Pendentes',   count: pendentes.length },
    { id: 'enviado',   label: 'Fechadas',    count: enviados.length },
  ]

  function abrirFecharModal(f: Faturamento) {
    setFecharModal(f)
    setDetalhesPag(1)
  }

  function confirmarFechamento() {
    if (!fecharModal) return
    setLista((prev) => prev.map((f) => f.id === fecharModal.id ? { ...f, status: 'enviado' } : f))
    setFecharModal(null)
    setTab('enviado')
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

      {tab === 'pendente'  && renderLista(pendentes, 'pendente')}
      {tab === 'enviado'   && renderLista(enviados,  'enviado')}

      {/* ── Modal: Fechar faturamento ──────────────────────────── */}
      <Modal
        isOpen={fecharModal !== null}
        onClose={() => setFecharModal(null)}
        title="Fechar faturamento"
        size="md"
      >
        {fecharModal && (() => {
          const contatos = CONTATOS_EMPRESA[fecharModal.empresa] ?? { emails: [], whatsapp: [] }

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

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setFecharModal(null)}>Cancelar</Button>
                <Button className="flex-1" onClick={confirmarFechamento}>
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
