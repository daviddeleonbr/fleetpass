'use client'

import { useState } from 'react'
import { FileDown, Sheet, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { ABASTECIMENTOS, POSTOS, agruparPorCombustivel, filtrarPorIntervalo, filtrarPorPosto, labelPeriodo, formatBRL } from '@/lib/relatorios-data'
import { exportarPDF, exportarExcel } from '@/lib/export'

const CORES: Record<string, string> = {
  'Diesel S-10': 'bg-blue-500',
  'Gasolina Comum': 'bg-amber-400',
  'Gasolina Aditivada': 'bg-orange-500',
  'Etanol': 'bg-emerald-500',
  'Diesel Comum': 'bg-slate-400',
  'GNV': 'bg-violet-400',
}

function defaultRange(): DateRange {
  const today = new Date()
  const fim = today.toISOString().slice(0, 10)
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  return { inicio: ini, fim }
}

export default function RelatorioCombustiveisPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [posto, setPosto] = useState('todos')
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingXLS, setLoadingXLS] = useState(false)

  const filtrados = filtrarPorPosto(filtrarPorIntervalo(ABASTECIMENTOS, range.inicio, range.fim), posto)
  const dados = agruparPorCombustivel(filtrados)
  const totalLitros = dados.reduce((s, d) => s + d.litros, 0)
  const totalValor = dados.reduce((s, d) => s + d.valor, 0)
  const totalAbast = dados.reduce((s, d) => s + d.abastecimentos, 0)

  const periodo = labelPeriodo(range.inicio, range.fim)

  const COLUNAS = ['Combustível', 'Abastecimentos', 'Volume (L)', '% Volume', 'Receita (R$)', '% Receita']
  const linhas = dados.map((d) => [
    d.combustivel,
    d.abastecimentos,
    `${d.litros} L`,
    `${((d.litros / totalLitros) * 100).toFixed(1)}%`,
    formatBRL(d.valor),
    `${((d.valor / totalValor) * 100).toFixed(1)}%`,
  ])

  const handlePDF = async () => {
    setLoadingPDF(true)
    await exportarPDF({
      titulo: 'Relatório por Combustível',
      subtitulo: `Distribuição de volume e receita por tipo de combustível — ${periodo}`,
      periodo,
      colunas: COLUNAS,
      linhas,
      totais: [
        { label: 'Abastecimentos', valor: String(totalAbast) },
        { label: 'Volume total', valor: `${totalLitros} L` },
        { label: 'Receita total', valor: formatBRL(totalValor) },
      ],
      nomeArquivo: `fuellink-combustiveis-${range.inicio}-a-${range.fim}`,
    })
    setLoadingPDF(false)
  }

  const handleExcel = async () => {
    setLoadingXLS(true)
    await exportarExcel(COLUNAS, linhas, `fuellink-combustiveis-${range.inicio}-a-${range.fim}`, 'Por Combustível')
    setLoadingXLS(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Droplets size={15} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório por Combustível</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Distribuição de volume vendido e receita por tipo de combustível.
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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Receita total', value: formatBRL(totalValor), sub: periodo },
          { label: 'Volume total', value: `${totalLitros} L`, sub: 'litros abastecidos' },
          { label: 'Abastecimentos', value: totalAbast, sub: 'transações realizadas' },
          { label: 'Tipos ativos', value: dados.length, sub: 'combustíveis vendidos' },
        ].map((k) => (
          <Card key={k.label} padding="md">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {dados.length === 0 ? (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Droplets size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">Nenhum abastecimento no período selecionado</p>
            <p className="text-xs text-gray-400">Tente ampliar o intervalo de datas</p>
          </div>
        </Card>
      ) : (
        /* Barras visuais + Tabela lado a lado */
        <div className="grid grid-cols-5 gap-5">
          {/* Mix visual */}
          <Card padding="md" className="col-span-2">
            <p className="text-sm font-semibold text-gray-700 mb-4">Mix de volume</p>
            <div className="space-y-3">
              {dados.map((d) => {
                const pct = (d.litros / totalLitros) * 100
                const cor = CORES[d.combustivel] ?? 'bg-gray-400'
                return (
                  <div key={d.combustivel}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cor}`} />
                        <span className="text-sm text-gray-700">{d.combustivel}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{d.litros} L</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{pct.toFixed(1)}%</p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Tabela */}
          <Card padding="none" className="col-span-3">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Detalhamento por combustível</p>
              <p className="text-xs text-gray-400">{periodo}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-3 text-left">Combustível</th>
                    <th className="px-5 py-3 text-center">Qtd.</th>
                    <th className="px-5 py-3 text-center">Volume</th>
                    <th className="px-5 py-3 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.map((d) => {
                    const cor = CORES[d.combustivel] ?? 'bg-gray-400'
                    return (
                      <tr key={d.combustivel} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cor}`} />
                            <span className="text-sm font-medium text-gray-800">{d.combustivel}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 text-center">{d.abastecimentos}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600 text-center">{d.litros} L</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatBRL(d.valor)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-5 py-3 text-sm font-bold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700 text-center">{totalAbast}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700 text-center">{totalLitros} L</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{formatBRL(totalValor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
