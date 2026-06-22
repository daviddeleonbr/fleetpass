'use client'

import { use, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, FileDown, Sheet, Phone, Mail, User,
  Truck, Droplets, AlertCircle, CheckCircle2, Clock, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { filtrarPorIntervalo, filtrarPorPosto, slugToEmpresa, labelPeriodo, formatBRL } from '@/lib/relatorios-data'
import { useAbastecimentos } from '@/hooks/use-abastecimentos'
import { exportarExtrato, exportarExcel } from '@/lib/export'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  faturado:   { label: 'Validada',   icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  contestado: { label: 'Contestado', icon: AlertCircle,   bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
}

function defaultRange(): DateRange {
  const today = new Date()
  const fim = today.toISOString().slice(0, 10)
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  return { inicio: ini, fim }
}

export default function DetalheEmpresaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const queryInicio = searchParams.get('inicio')
  const queryFim    = searchParams.get('fim')
  const queryPosto  = searchParams.get('posto') ?? 'todos'

  const [range, setRange] = useState<DateRange>(
    queryInicio && queryFim ? { inicio: queryInicio, fim: queryFim } : defaultRange()
  )
  const [posto, setPosto] = useState(queryPosto)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingXLS, setLoadingXLS] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const { abastecimentos: ABASTECIMENTOS, postos: POSTOS, loading } = useAbastecimentos()

  const nomeEmpresa = slugToEmpresa(slug)

  // Filtra por empresa, posto e pelo intervalo selecionado
  const tudo = filtrarPorPosto(
    filtrarPorIntervalo(
      ABASTECIMENTOS.filter((a) => a.empresa.toLowerCase() === nomeEmpresa.toLowerCase()),
      range.inicio,
      range.fim
    ),
    posto
  )

  // Todos os registros da empresa (sem filtro de data) para exibir dados fixos como contatos
  const todosEmpresa = ABASTECIMENTOS.filter((a) => a.empresa.toLowerCase() === nomeEmpresa.toLowerCase())

  if (!loading && todosEmpresa.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle size={32} className="text-gray-300" />
        <p className="text-gray-500 text-sm">Empresa não encontrada.</p>
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} /> Voltar
        </Button>
      </div>
    )
  }

  const info = todosEmpresa[0]
  const periodo = labelPeriodo(range.inicio, range.fim)

  // Métricas do período filtrado
  const totalGeral    = tudo.reduce((s, a) => s + a.valor, 0)
  const totalPendente = tudo.filter((a) => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const totalFaturado = tudo.filter((a) => a.status === 'faturado').reduce((s, a) => s + a.valor, 0)
  const totalContest  = tudo.filter((a) => a.status === 'contestado').reduce((s, a) => s + a.valor, 0)
  const totalLitros   = tudo.reduce((s, a) => s + a.litros, 0)
  const ticketMedio   = tudo.length > 0 ? totalGeral / tudo.length : 0

  // Agrupamentos do período
  const porVeiculo = Object.values(
    tudo.reduce<Record<string, { veiculo: string; abastecimentos: number; litros: number; valor: number }>>(
      (acc, a) => {
        if (!acc[a.veiculo]) acc[a.veiculo] = { veiculo: a.veiculo, abastecimentos: 0, litros: 0, valor: 0 }
        acc[a.veiculo].abastecimentos++
        acc[a.veiculo].litros += a.litros
        acc[a.veiculo].valor  += a.valor
        return acc
      }, {}
    )
  ).sort((a, b) => b.valor - a.valor)

  const porCombustivel = Object.values(
    tudo.reduce<Record<string, { combustivel: string; abastecimentos: number; litros: number; valor: number }>>(
      (acc, a) => {
        if (!acc[a.combustivel]) acc[a.combustivel] = { combustivel: a.combustivel, abastecimentos: 0, litros: 0, valor: 0 }
        acc[a.combustivel].abastecimentos++
        acc[a.combustivel].litros += a.litros
        acc[a.combustivel].valor  += a.valor
        return acc
      }, {}
    )
  ).sort((a, b) => b.valor - a.valor)

  const veiculos   = [...new Set(todosEmpresa.map((a) => a.veiculo))]
  const motoristas = [...new Set(todosEmpresa.map((a) => a.motorista))]
  const listagem   = filtroStatus === 'todos' ? tudo : tudo.filter((a) => a.status === filtroStatus)

  // ── Exportações
  const handlePDF = async () => {
    setLoadingPDF(true)
    await exportarExtrato({
      empresa: info.empresa, cnpj: info.cnpj, responsavel: info.responsavel,
      email: info.email, telefone: info.telefone, periodo,
      totalGeral, totalPendente, totalFaturado, totalContestado: totalContest, totalLitros,
      abastecimentos: tudo.map((a) => ({
        codigo: a.codigo, data: a.data, veiculo: a.veiculo, motorista: a.motorista,
        combustivel: a.combustivel, litros: a.litros, valorUnitario: a.valorUnitario,
        valor: a.valor, status: a.status,
      })),
      porVeiculo,
      porCombustivel,
      nomeArquivo: `extrato-${slug}-${range.inicio}-a-${range.fim}`,
    })
    setLoadingPDF(false)
  }

  const handleExcel = async () => {
    setLoadingXLS(true)
    await exportarExcel(
      ['Código', 'Data', 'Veículo', 'Motorista', 'Combustível', 'Litros', 'R$/L', 'Total', 'Status'],
      tudo.map((a) => [a.codigo, a.data, a.veiculo, a.motorista, a.combustivel, `${a.litros} L`, formatBRL(a.valorUnitario), formatBRL(a.valor), a.status]),
      `extrato-${slug}-${range.inicio}-a-${range.fim}`,
      'Extrato',
    )
    setLoadingXLS(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Relatório por Empresa
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{info.empresa}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{info.cnpj}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            value={posto}
            onChange={e => { setPosto(e.target.value); setFiltroStatus('todos') }}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {POSTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <DateRangePicker value={range} onChange={(r) => { setRange(r); setFiltroStatus('todos') }} />
          <Button variant="secondary" size="sm" onClick={handleExcel} isLoading={loadingXLS} disabled={tudo.length === 0}>
            <Sheet size={14} /> Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handlePDF} isLoading={loadingPDF} disabled={tudo.length === 0}>
            <FileDown size={14} /> Extrato PDF
          </Button>
        </div>
      </div>

      {/* ── Alerta contestado */}
      {totalContest > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-800">
            Esta empresa possui <strong>{formatBRL(totalContest)}</strong> em abastecimentos contestados no período <strong>{periodo}</strong>.
          </p>
        </div>
      )}

      {/* ── Empty state de período */}
      {tudo.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 gap-2">
          <AlertCircle size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">Nenhum abastecimento neste período</p>
          <p className="text-xs text-gray-400">Altere o intervalo de datas acima</p>
        </div>
      )}

      {tudo.length > 0 && (
        <>
          {/* ── Ficha + KPIs */}
          <div className="grid grid-cols-3 gap-5">
            <Card padding="md" className="col-span-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dados da empresa</p>
              <div className="space-y-2.5">
                {[
                  { icon: User,   label: 'Responsável', value: info.responsavel },
                  { icon: Mail,   label: 'Email',        value: info.email },
                  { icon: Phone,  label: 'Telefone',     value: info.telefone },
                  { icon: Truck,  label: 'Veíc. / Motor.', value: `${veiculos.length} veículos · ${motoristas.length} motoristas` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon size={14} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: 'Total do período', value: formatBRL(totalGeral), sub: `${tudo.length} abastecimentos · ${periodo}`, color: 'text-gray-900', highlight: true },
                { label: 'Ticket médio', value: formatBRL(ticketMedio), sub: 'por abastecimento', color: 'text-gray-900' },
                { label: 'A faturar', value: formatBRL(totalPendente), sub: `${tudo.filter(a => a.status === 'pendente').length} pendentes`, color: 'text-amber-600' },
                { label: 'Volume total', value: `${totalLitros} L`, sub: 'litros abastecidos', color: 'text-gray-900' },
              ].map((k) => (
                <Card key={k.label} padding="md" className={k.highlight ? 'border-blue-100 bg-blue-50/30' : ''}>
                  <p className="text-sm text-gray-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Status cards (filtros interativos) */}
          <div className="grid grid-cols-3 gap-4">
            {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              const valor = key === 'pendente' ? totalPendente : key === 'faturado' ? totalFaturado : totalContest
              const qtd   = tudo.filter((a) => a.status === key).length
              return (
                <button
                  key={key}
                  onClick={() => setFiltroStatus(filtroStatus === key ? 'todos' : key)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    cfg.bg, cfg.border,
                    filtroStatus === key ? 'ring-2 ring-offset-1 ring-blue-400 shadow-sm' : 'hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={15} className={cfg.text} />
                      <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-white/70 ${cfg.text}`}>
                      {qtd} req.
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${cfg.text}`}>{formatBRL(valor)}</p>
                </button>
              )
            })}
          </div>

          {/* ── Tabela de requisições */}
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Requisições do período</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filtroStatus === 'todos'
                    ? `${tudo.length} requisições · ${periodo}`
                    : `${listagem.length} filtradas por status "${STATUS_CONFIG[filtroStatus as keyof typeof STATUS_CONFIG]?.label}" · `}
                  {filtroStatus !== 'todos' && (
                    <button onClick={() => setFiltroStatus('todos')} className="text-blue-500 hover:underline">
                      limpar filtro
                    </button>
                  )}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-3 text-left">Código</th>
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-left">Veículo</th>
                    <th className="px-5 py-3 text-left">Motorista</th>
                    <th className="px-5 py-3 text-left">Combustível</th>
                    <th className="px-5 py-3 text-right">Litros</th>
                    <th className="px-5 py-3 text-right">R$/L</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listagem.map((a) => {
                    const sc = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG]
                    const StatusIcon = sc.icon
                    return (
                      <tr key={a.codigo} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {a.codigo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{a.data}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-sm text-gray-700">{a.veiculo}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">{a.motorista}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {a.combustivel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 text-right">{a.litros} L</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 text-right">{formatBRL(a.valorUnitario)}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900 text-right">{formatBRL(a.valor)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border', sc.bg, sc.text, sc.border)}>
                            <StatusIcon size={10} />
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-5 py-3 text-sm font-bold text-gray-700">
                      Total{filtroStatus !== 'todos' ? ` — ${STATUS_CONFIG[filtroStatus as keyof typeof STATUS_CONFIG]?.label}` : ' geral'}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700 text-right">
                      {listagem.reduce((s, a) => s + a.litros, 0)} L
                    </td>
                    <td />
                    <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatBRL(listagem.reduce((s, a) => s + a.valor, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* ── Breakdown por veículo e combustível */}
          <div className="grid grid-cols-2 gap-5">
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Truck size={15} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Por veículo</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-2.5 text-left">Placa</th>
                    <th className="px-5 py-2.5 text-center">Abast.</th>
                    <th className="px-5 py-2.5 text-right">Volume</th>
                    <th className="px-5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porVeiculo.map((v) => (
                    <tr key={v.veiculo} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3"><span className="font-mono text-sm font-semibold text-gray-800">{v.veiculo}</span></td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-center">{v.abastecimentos}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-right">{v.litros} L</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(v.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-600" colSpan={2}>Total</td>
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-700 text-right">{totalLitros} L</td>
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-900 text-right">{formatBRL(totalGeral)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Droplets size={15} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Por combustível</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-2.5 text-left">Combustível</th>
                    <th className="px-5 py-2.5 text-center">Abast.</th>
                    <th className="px-5 py-2.5 text-right">Volume</th>
                    <th className="px-5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porCombustivel.map((c) => (
                    <tr key={c.combustivel} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c.combustivel}</span></td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-center">{c.abastecimentos}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-right">{c.litros} L</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-600" colSpan={2}>Total</td>
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-700 text-right">{totalLitros} L</td>
                    <td className="px-5 py-2.5 text-xs font-bold text-gray-900 text-right">{formatBRL(totalGeral)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
