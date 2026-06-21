'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, FileText, ChevronDown, ChevronUp, Download, Store, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'

type StatusFatura = 'aberto' | 'emitida'

type Abastecimento = {
  codigo: string
  data: string
  veiculo: string
  motorista: string
  combustivel: string
  litros: number
  valor: number
}

type Fatura = {
  id: string
  numero: string
  posto: string
  ciclo: string
  periodo: { inicio: string; fim: string }
  dataEmissao: string
  abastecimentos: number
  litros: number
  valor: number
  status: StatusFatura
  detalhe: Abastecimento[]
}

const FATURAS: Fatura[] = [
  {
    id: 'fat-e-001',
    numero: 'FAT-2026-001',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    periodo: { inicio: '01/01/2026', fim: '31/01/2026' },
    dataEmissao: '01/02/2026',
    abastecimentos: 3,
    litros: 178,
    valor: 1112.50,
    status: 'emitida',
    detalhe: [
      { codigo: 'FL-AA1-1A1', data: '03/01/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10', litros: 50, valor: 312.50 },
      { codigo: 'FL-AA1-1A4', data: '14/01/2026', veiculo: 'GHI-9012', motorista: 'Carlos Santos', combustivel: 'Diesel S-10', litros: 60, valor: 375.00 },
      { codigo: 'FL-AA1-1A8', data: '28/01/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',     combustivel: 'Diesel S-10', litros: 68, valor: 425.00 },
    ],
  },
  {
    id: 'fat-e-002',
    numero: 'FAT-2026-002',
    posto: 'Ipiranga — Leste',
    ciclo: 'Quinzenal + 7 dias',
    periodo: { inicio: '01/01/2026', fim: '15/01/2026' },
    dataEmissao: '16/01/2026',
    abastecimentos: 4,
    litros: 213,
    valor: 1347.80,
    status: 'emitida',
    detalhe: [
      { codigo: 'FL-IP1-0A1', data: '02/01/2026', veiculo: 'JKL-3456', motorista: 'Marcos Alves',  combustivel: 'Diesel Comum', litros: 55, valor: 335.50 },
      { codigo: 'FL-IP1-0A3', data: '05/01/2026', veiculo: 'ABC-1234', motorista: 'Roberto Lima',  combustivel: 'Diesel S-10',  litros: 62, valor: 391.26 },
      { codigo: 'FL-IP1-0A7', data: '10/01/2026', veiculo: 'MNO-7890', motorista: 'Fernanda Rocha',combustivel: 'Etanol',       litros: 48, valor: 265.44 },
      { codigo: 'FL-IP1-0A9', data: '14/01/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',     combustivel: 'Diesel S-10',  litros: 48, valor: 355.60 },
    ],
  },
  {
    id: 'fat-e-003',
    numero: 'FAT-2026-003',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    periodo: { inicio: '01/02/2026', fim: '28/02/2026' },
    dataEmissao: '01/03/2026',
    abastecimentos: 5,
    litros: 293,
    valor: 1865.27,
    status: 'emitida',
    detalhe: [
      { codigo: 'FL-BB2-2B1', data: '02/02/2026', veiculo: 'JKL-3456', motorista: 'Marcos Alves',  combustivel: 'Diesel S-10',    litros: 72, valor: 455.04 },
      { codigo: 'FL-BB2-2B5', data: '14/02/2026', veiculo: 'ABC-1234', motorista: 'Carlos Santos', combustivel: 'Diesel S-10',    litros: 48, valor: 303.36 },
      { codigo: 'FL-BB2-2B9', data: '27/02/2026', veiculo: 'GHI-9012', motorista: 'Carlos Santos', combustivel: 'Gasolina Comum', litros: 33, valor: 181.83 },
      { codigo: 'FL-BB2-2B8', data: '25/02/2026', veiculo: 'CAL-6789', motorista: 'Marcos Lima',   combustivel: 'Diesel Comum',   litros: 48, valor: 276.00 },
      { codigo: 'FL-BB2-2B3', data: '10/02/2026', veiculo: 'CAL-5678', motorista: 'Pedro Gomes',   combustivel: 'Gasolina Comum', litros: 32, valor: 176.32 },
    ],
  },
  {
    id: 'fat-e-004',
    numero: 'FAT-2026-004',
    posto: 'Petrobras — Sul',
    ciclo: 'Quinzenal + 7 dias',
    periodo: { inicio: '01/02/2026', fim: '15/02/2026' },
    dataEmissao: '16/02/2026',
    abastecimentos: 2,
    litros: 118,
    valor: 746.60,
    status: 'emitida',
    detalhe: [
      { codigo: 'FL-PB2-3C1', data: '04/02/2026', veiculo: 'DEF-5678', motorista: 'Ana Costa',    combustivel: 'Diesel S-10', litros: 58, valor: 366.74 },
      { codigo: 'FL-PB2-3C5', data: '12/02/2026', veiculo: 'ABC-1234', motorista: 'Roberto Lima', combustivel: 'Diesel S-10', litros: 60, valor: 379.86 },
    ],
  },
  {
    id: 'fat-e-005',
    numero: 'FAT-2026-005',
    posto: 'Ipiranga — Leste',
    ciclo: 'Quinzenal + 7 dias',
    periodo: { inicio: '01/03/2026', fim: '15/03/2026' },
    dataEmissao: '16/03/2026',
    abastecimentos: 3,
    litros: 175,
    valor: 1106.25,
    status: 'emitida',
    detalhe: [
      { codigo: 'FL-IP2-5D1', data: '02/03/2026', veiculo: 'MNO-7890', motorista: 'Fernanda Rocha', combustivel: 'Etanol',      litros: 50, valor: 277.50 },
      { codigo: 'FL-IP2-5D4', data: '07/03/2026', veiculo: 'JKL-3456', motorista: 'Marcos Alves',   combustivel: 'Diesel Comum', litros: 65, valor: 373.75 },
      { codigo: 'FL-IP2-5D9', data: '13/03/2026', veiculo: 'ABC-1234', motorista: 'Roberto Lima',   combustivel: 'Diesel S-10',  litros: 60, valor: 455.00 },
    ],
  },
  {
    id: 'fat-e-006',
    numero: 'FAT-2026-006',
    posto: 'Shell — Centro',
    ciclo: 'Mensal + 5 dias',
    periodo: { inicio: '01/03/2026', fim: '31/03/2026' },
    dataEmissao: '—',
    abastecimentos: 11,
    litros: 684,
    valor: 4318.90,
    status: 'aberto',
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
]

const STATUS_CFG: Record<StatusFatura, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  aberto:   { label: 'Em aberto',         bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',   icon: Clock },
  emitida:  { label: 'Fatura fechada',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',icon: CheckCircle2 },
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusChip({ status }: { status: StatusFatura }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  )
}

function FaturaCard({ f, onDetalhe }: { f: Fatura; onDetalhe: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-4">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-mono text-xs font-semibold text-gray-500">{f.numero}</span>
            <span className="text-gray-200 text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              <Store size={10} /> {f.posto}
            </span>
            <StatusChip status={f.status} />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 mb-3">
            <span>Período: <strong className="text-gray-700">{f.periodo.inicio} — {f.periodo.fim}</strong></span>
            {f.status !== 'aberto' && (
              <span>Emitida em: <strong className="text-gray-700">{f.dataEmissao}</strong></span>
            )}
            <span className="text-gray-400 italic">{f.ciclo}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-gray-900">{formatBRL(f.valor)}</span>
              {f.status === 'aberto' && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">parcial</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Droplets size={12} className="text-blue-400" /> {f.litros} L
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <FileText size={12} className="text-gray-300" /> {f.abastecimentos} abastecimento{f.abastecimentos !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2 shrink-0 items-end">
          {f.status === 'emitida' && (
            <Button size="sm" onClick={onDetalhe}>
              <FileText size={13} /> Ver detalhes
            </Button>
          )}
          {f.status === 'aberto' && (
            <Button size="sm" variant="secondary" onClick={onDetalhe}>
              <FileText size={13} /> Ver detalhes
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

      {/* Tabela expandida */}
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
                  <td className="px-3 py-2 font-mono text-gray-500">{a.codigo}</td>
                  <td className="px-3 py-2 text-gray-600">{a.data}</td>
                  <td className="px-3 py-2 text-gray-700 font-mono font-medium">{a.veiculo}</td>
                  <td className="px-3 py-2 text-gray-600">{a.motorista}</td>
                  <td className="px-3 py-2 text-gray-600">{a.combustivel}</td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium">{a.litros} L</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatBRL(a.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-700">
                <td colSpan={5} className="px-3 py-2 text-right text-xs text-gray-400 uppercase tracking-wide">Total</td>
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

export default function EmpresaFaturamentoPage() {
  const [tab, setTab] = useState('aberto')
  const [detalheModal, setDetalheModal] = useState<Fatura | null>(null)

  const emAberto  = FATURAS.filter((f) => f.status === 'aberto')
  const emitidas  = FATURAS.filter((f) => f.status === 'emitida')

  const tabs = [
    { id: 'aberto',  label: 'Em aberto',      count: emAberto.length },
    { id: 'fechada', label: 'Faturas fechadas', count: emitidas.length },
  ]

  const totalAberto   = emAberto.reduce((s, f) => s + f.valor, 0)
  const totalFechado  = emitidas.reduce((s, f) => s + f.valor, 0)

  const renderLista = (items: Fatura[]) => (
    <div className="space-y-4">
      {items.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma fatura nesta categoria.</p>
        </Card>
      )}
      {items.map((f) => (
        <FaturaCard key={f.id} f={f} onDetalhe={() => setDetalheModal(f)} />
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
        <p className="text-gray-500 text-sm">Faturas e relatórios de abastecimento por parceria.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4">
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Total em aberto</p>
          <p className="text-2xl font-bold text-gray-900">{formatBRL(totalAberto)}</p>
          <p className="text-xs text-gray-400 mt-1">{emAberto.length} fatura{emAberto.length !== 1 ? 's' : ''}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 mb-1">Faturas fechadas</p>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalFechado)}</p>
          <p className="text-xs text-gray-400 mt-1">{emitidas.length} fatura{emitidas.length !== 1 ? 's' : ''}</p>
        </Card>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'aberto'  && renderLista(emAberto)}
      {tab === 'fechada' && renderLista(emitidas)}

      {/* Modal de detalhes / relatório */}
      <Modal
        isOpen={detalheModal !== null}
        onClose={() => setDetalheModal(null)}
        title={`Detalhes — ${detalheModal?.numero}`}
        size="lg"
      >
        {detalheModal && (
          <div className="space-y-4 overflow-y-auto">
            {/* Cabeçalho da fatura */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Número da fatura</p>
                  <p className="text-sm font-bold font-mono text-gray-900">{detalheModal.numero}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Posto parceiro</p>
                  <p className="text-sm font-medium text-gray-800">{detalheModal.posto}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ciclo de faturamento</p>
                  <p className="text-xs text-gray-600">{detalheModal.ciclo}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Período</p>
                  <p className="text-sm font-medium text-gray-800">{detalheModal.periodo.inicio} — {detalheModal.periodo.fim}</p>
                </div>
                {detalheModal.status !== 'aberto' && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Data de emissão</p>
                    <p className="text-sm font-medium text-gray-800">{detalheModal.dataEmissao}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Totais */}
            <div className="flex items-center gap-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div>
                <p className="text-[10px] text-blue-500 uppercase tracking-wide">Valor total</p>
                <p className="text-xl font-bold text-gray-900">{formatBRL(detalheModal.valor)}</p>
              </div>
              <div className="h-8 w-px bg-blue-200" />
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Droplets size={14} className="text-blue-400" /> {detalheModal.litros} litros
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <FileText size={14} className="text-gray-400" /> {detalheModal.abastecimentos} abastecimento{detalheModal.abastecimentos !== 1 ? 's' : ''}
              </div>
              <div className="ml-auto">
                <StatusChip status={detalheModal.status} />
              </div>
            </div>

            {/* Tabela de abastecimentos */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Abastecimentos do período</p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
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
                    {detalheModal.detalhe.map((a) => (
                      <tr key={a.codigo} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 font-mono text-gray-500">{a.codigo}</td>
                        <td className="px-3 py-2 text-gray-600">{a.data}</td>
                        <td className="px-3 py-2 font-mono font-medium text-gray-700">{a.veiculo}</td>
                        <td className="px-3 py-2 text-gray-600">{a.motorista}</td>
                        <td className="px-3 py-2 text-gray-600">{a.combustivel}</td>
                        <td className="px-3 py-2 text-right text-gray-700 font-medium">{a.litros} L</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatBRL(a.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-700">
                      <td colSpan={5} className="px-3 py-2 text-right text-[10px] text-gray-400 uppercase tracking-wide">Total</td>
                      <td className="px-3 py-2 text-right">{detalheModal.litros} L</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatBRL(detalheModal.valor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Botões de relatório */}
            <div className="flex gap-3 pt-1">
              <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Download size={14} /> Baixar PDF
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Download size={14} /> Exportar CSV
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
