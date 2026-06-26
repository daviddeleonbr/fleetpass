'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, FileDown, Sheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangePicker, type DateRange } from '@/components/ui/date-range-picker'
import { exportarPDF, exportarExcel } from '@/lib/export'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function labelPeriodo(inicio: string, fim: string) {
  const fmt = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }
  return `${fmt(inicio)} a ${fmt(fim)}`
}

function defaultRange(): DateRange {
  const today = new Date()
  const fim = today.toISOString().slice(0, 10)
  const ini = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  return { inicio: ini, fim }
}

type Liberacao = {
  id: string
  dataHora: string
  frentista: string
  frentistaId: string | null
  empresa: string
  placa: string
  veiculo: string
  motorista: string
  combustivel: string
  litros: number
  valorUnitario: number
  valorTotal: number
  codigo: string
  posto: string
}

type Frentista = { id: string; nome: string; postoId: string }
type Posto = { id: string; nome: string }

export default function RelatorioFrentistasPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [postoFilter, setPostoFilter] = useState('todos')
  const [frentistaFilter, setFretistaFilter] = useState('todos')
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([])
  const [frentistas, setFrentistas] = useState<Frentista[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingXLS, setLoadingXLS] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('inicio', range.inicio)
      params.set('fim', range.fim)
      if (postoFilter !== 'todos') params.set('posto', postoFilter)
      if (frentistaFilter !== 'todos') params.set('frentista', frentistaFilter)

      try {
        const res = await fetch(`/api/posto/relatorios/frentistas?${params}`)
        if (!res.ok) throw new Error('Erro ao carregar dados')
        const data = await res.json()
        setLiberacoes(data.liberacoes ?? [])
        setFrentistas(data.frentistas ?? [])
        setPostos(data.postos ?? [])
      } catch {
        setLiberacoes([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [range, postoFilter, frentistaFilter])

  // Agrupar por frentista
  const agrupado = useMemo(() => {
    const mapa: Record<string, { nome: string; liberacoes: Liberacao[]; totalLitros: number; totalValor: number }> = {}
    for (const l of liberacoes) {
      const key = l.frentistaId ?? 'desconhecido'
      if (!mapa[key]) mapa[key] = { nome: l.frentista, liberacoes: [], totalLitros: 0, totalValor: 0 }
      mapa[key].liberacoes.push(l)
      mapa[key].totalLitros += l.litros
      mapa[key].totalValor += l.valorTotal
    }
    return Object.entries(mapa)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalValor - a.totalValor)
  }, [liberacoes])

  const totalGeral = liberacoes.reduce((s, l) => s + l.valorTotal, 0)
  const totalLitros = liberacoes.reduce((s, l) => s + l.litros, 0)
  const periodo = labelPeriodo(range.inicio, range.fim)

  const frentistasDoPostoFiltrado = postoFilter === 'todos'
    ? frentistas
    : frentistas.filter(f => f.postoId === postoFilter)

  // Export
  const COLUNAS = ['Frentista', 'Data', 'Horário', 'Empresa', 'Placa', 'Motorista', 'Combustível', 'Litros', 'Valor Total']
  const linhas = liberacoes.map(l => [
    l.frentista,
    formatDate(l.dataHora),
    formatTime(l.dataHora),
    l.empresa,
    l.placa,
    l.motorista,
    l.combustivel,
    l.litros,
    formatBRL(l.valorTotal),
  ])

  const handlePDF = async () => {
    setLoadingPDF(true)
    await exportarPDF({
      titulo: 'Relatório de Liberações por Frentista',
      subtitulo: `Detalhamento de liberações realizadas por cada frentista — ${periodo}`,
      periodo,
      colunas: COLUNAS,
      linhas,
      totais: [
        { label: 'Total de liberações', valor: String(liberacoes.length) },
        { label: 'Frentistas', valor: String(agrupado.length) },
        { label: 'Volume total', valor: `${totalLitros.toFixed(1)} L` },
        { label: 'Valor total', valor: formatBRL(totalGeral) },
      ],
      nomeArquivo: `fleetpass-frentistas-${range.inicio}-a-${range.fim}`,
    })
    setLoadingPDF(false)
  }

  const handleExcel = async () => {
    setLoadingXLS(true)
    await exportarExcel(COLUNAS, linhas, `fleetpass-frentistas-${range.inicio}-a-${range.fim}`, 'Por Frentista')
    setLoadingXLS(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users size={15} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Liberações por Frentista</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Detalhamento de liberações realizadas por cada frentista no período selecionado.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            value={postoFilter}
            onChange={e => { setPostoFilter(e.target.value); setFretistaFilter('todos') }}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os postos</option>
            {postos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select
            value={frentistaFilter}
            onChange={e => setFretistaFilter(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os frentistas</option>
            {frentistasDoPostoFiltrado.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="secondary" size="sm" onClick={handleExcel} isLoading={loadingXLS} disabled={liberacoes.length === 0}>
            <Sheet size={14} /> Excel
          </Button>
          <Button variant="primary" size="sm" onClick={handlePDF} isLoading={loadingPDF} disabled={liberacoes.length === 0}>
            <FileDown size={14} /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Valor total', value: formatBRL(totalGeral), sub: periodo, highlight: true },
          { label: 'Liberações', value: liberacoes.length, sub: 'no período' },
          { label: 'Volume total', value: `${totalLitros.toFixed(1)} L`, sub: 'litros liberados' },
          { label: 'Frentistas', value: agrupado.length, sub: 'com liberações' },
        ].map(k => (
          <Card key={k.label} padding="md">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.highlight ? 'text-blue-600' : 'text-gray-900'}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Carregando liberações...</p>
        </div>
      ) : liberacoes.length === 0 ? (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">Nenhuma liberação encontrada no período</p>
            <p className="text-xs text-gray-400">Tente ampliar o intervalo de datas ou alterar os filtros</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {agrupado.map(grupo => (
            <Card key={grupo.id} padding="none">
              {/* Header do frentista */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-700">
                      {grupo.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{grupo.nome}</p>
                    <p className="text-xs text-gray-400">{grupo.liberacoes.length} liberaç{grupo.liberacoes.length === 1 ? 'ão' : 'ões'} no período</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatBRL(grupo.totalValor)}</p>
                  <p className="text-xs text-gray-400">{grupo.totalLitros.toFixed(1)} L</p>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                      <th className="px-5 py-2.5 text-left">Data / Hora</th>
                      <th className="px-5 py-2.5 text-left">Empresa</th>
                      <th className="px-5 py-2.5 text-left">Placa</th>
                      <th className="px-5 py-2.5 text-left">Motorista</th>
                      <th className="px-5 py-2.5 text-left">Combustível</th>
                      <th className="px-5 py-2.5 text-right">Litros</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {grupo.liberacoes.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(l.dataHora)}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{l.empresa}</td>
                        <td className="px-5 py-3 text-sm font-mono text-gray-700">{l.placa}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{l.motorista}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{l.combustivel}</td>
                        <td className="px-5 py-3 text-sm text-gray-700 text-right">{l.litros.toFixed(1)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(l.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={5} className="px-5 py-2.5 text-xs font-bold text-gray-600">Subtotal — {grupo.nome}</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-gray-700 text-right">{grupo.totalLitros.toFixed(1)} L</td>
                      <td className="px-5 py-2.5 text-xs font-bold text-gray-900 text-right">{formatBRL(grupo.totalValor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}

          {/* Total geral */}
          <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-800">Total geral — {agrupado.length} frentista{agrupado.length !== 1 ? 's' : ''} · {liberacoes.length} liberaç{liberacoes.length === 1 ? 'ão' : 'ões'}</p>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-700">{formatBRL(totalGeral)}</p>
              <p className="text-xs text-blue-500">{totalLitros.toFixed(1)} L</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
