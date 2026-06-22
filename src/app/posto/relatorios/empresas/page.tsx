'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileDown, Sheet, Building2, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { agruparPorEmpresa, filtrarPorIntervalo, filtrarPorPosto, empresaSlug, labelPeriodo, formatBRL } from '@/lib/relatorios-data'
import { useAbastecimentos } from '@/hooks/use-abastecimentos'
import { exportarPDF, exportarExcel } from '@/lib/export'
import { cn } from '@/lib/utils'

function defaultRange(): DateRange {
  const today = new Date()
  const fim = today.toISOString().slice(0, 10)
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  return { inicio: ini, fim }
}

export default function RelatorioEmpresasPage() {
  const router = useRouter()
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [posto, setPosto] = useState('todos')
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingXLS, setLoadingXLS] = useState(false)
  const { abastecimentos: ABASTECIMENTOS, postos: POSTOS } = useAbastecimentos()

  const filtrados = filtrarPorPosto(filtrarPorIntervalo(ABASTECIMENTOS, range.inicio, range.fim), posto)
  const dados = agruparPorEmpresa(filtrados)

  const totalGeral     = dados.reduce((s, d) => s + d.valor, 0)
  const totalLitros    = dados.reduce((s, d) => s + d.litros, 0)
  const totalAbast     = dados.reduce((s, d) => s + d.abastecimentos, 0)
  const totalPendente  = dados.reduce((s, d) => s + d.pendente, 0)
  const totalContestado = dados.reduce((s, d) => s + d.contestado, 0)

  const periodo = labelPeriodo(range.inicio, range.fim)

  const COLUNAS = ['Empresa', 'CNPJ', 'Abastecimentos', 'Volume (L)', 'Pendente (R$)', 'Faturado (R$)', 'Total (R$)']
  const linhas = dados.map((d) => [
    d.empresa, d.cnpj, d.abastecimentos,
    `${d.litros} L`, formatBRL(d.pendente), formatBRL(d.faturado), formatBRL(d.valor),
  ])

  const handlePDF = async () => {
    setLoadingPDF(true)
    await exportarPDF({
      titulo: 'Relatório por Empresa', subtitulo: `Faturamento por empresa parceira — ${periodo}`,
      periodo, colunas: COLUNAS, linhas,
      totais: [
        { label: 'Contestado', valor: formatBRL(totalContestado) },
        { label: 'Pendente', valor: formatBRL(totalPendente) },
        { label: 'Total geral', valor: formatBRL(totalGeral) },
      ],
      nomeArquivo: `fuellink-empresas-${range.inicio}-a-${range.fim}`,
    })
    setLoadingPDF(false)
  }

  const handleExcel = async () => {
    setLoadingXLS(true)
    await exportarExcel(COLUNAS, linhas, `fuellink-empresas-${range.inicio}-a-${range.fim}`, 'Por Empresa')
    setLoadingXLS(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 size={15} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório por Empresa</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Consumo e faturamento por empresa. Clique em uma empresa para ver o detalhamento completo.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            value={posto}
            onChange={e => setPosto(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {POSTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="secondary" size="sm" onClick={handleExcel} isLoading={loadingXLS} disabled={dados.length === 0}>
            <Sheet size={14} /> Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handlePDF} isLoading={loadingPDF} disabled={dados.length === 0}>
            <FileDown size={14} /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Alerta contestado */}
      {totalContestado > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{formatBRL(totalContestado)}</strong> em abastecimentos contestados aguardam resolução.
            Acesse o detalhamento de cada empresa para mais informações.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total do período', value: formatBRL(totalGeral), sub: periodo, color: 'text-gray-900' },
          { label: 'A faturar', value: formatBRL(totalPendente), sub: 'aguardando fatura', color: 'text-amber-600' },
          { label: 'Validadas', value: formatBRL(totalGeral - totalPendente - totalContestado), sub: 'neste período', color: 'text-emerald-600' },
          { label: 'Contestado', value: formatBRL(totalContestado), sub: 'requer análise', color: 'text-red-500' },
        ].map((k) => (
          <Card key={k.label} padding="md">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Empresas parceiras</p>
            <p className="text-xs text-gray-400 mt-0.5">Clique em uma linha para ver todas as requisições do período</p>
          </div>
          <p className="text-xs text-gray-400">{dados.length} empresas · {totalAbast} abastecimentos · {periodo}</p>
        </div>

        {dados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Building2 size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">Nenhum abastecimento no período selecionado</p>
            <p className="text-xs text-gray-400">Tente ampliar o intervalo de datas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Empresa</th>
                  <th className="px-6 py-3 text-center">Abast.</th>
                  <th className="px-6 py-3 text-center">Volume</th>
                  <th className="px-6 py-3 text-right">A faturar</th>
                  <th className="px-6 py-3 text-right">Faturado</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">% Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dados.map((d, i) => {
                  const pct = totalGeral > 0 ? (d.valor / totalGeral) * 100 : 0
                  const temContestado = d.contestado > 0
                  return (
                    <tr
                      key={d.empresa}
                      onClick={() => router.push(`/posto/relatorios/empresas/${empresaSlug(d.empresa)}?inicio=${range.inicio}&fim=${range.fim}&posto=${posto}`)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">{d.empresa}</span>
                          {temContestado && (
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              Contestado
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-gray-400">{d.cnpj}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{d.abastecimentos}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{d.litros} L</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn('text-sm font-medium', d.pendente > 0 ? 'text-amber-600' : 'text-gray-400')}>
                          {formatBRL(d.pendente)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-medium text-right">
                        {formatBRL(d.faturado)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatBRL(d.valor)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-bold text-gray-700">Total geral</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-700 text-center">{totalAbast}</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-700 text-center">{totalLitros} L</td>
                  <td className="px-6 py-3 text-sm font-bold text-amber-600 text-right">{formatBRL(totalPendente)}</td>
                  <td className="px-6 py-3 text-sm font-bold text-emerald-600 text-right">{formatBRL(totalGeral - totalPendente - totalContestado)}</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{formatBRL(totalGeral)}</td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-700 text-right">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
