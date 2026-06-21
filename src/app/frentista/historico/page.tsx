'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Loader2, AlertCircle } from 'lucide-react'

type Dia = 'hoje' | 'ontem'

type Liberacao = {
  id: string
  dataHora: string
  frentista: string
  frentistaId: string | null
  empresa: string
  placa: string
  motorista: string
  combustivel: string
  litros: number
  valorTotal: number
  codigo: string
}

type FrentistaOpt = { id: string; nome: string }

export default function HistoricoPage() {
  const [dia, setDia] = useState<Dia>('hoje')
  const [frentistaFilter, setFretistaFilter] = useState('todos')
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([])
  const [frentistas, setFrentistas] = useState<FrentistaOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    setLoading(true)
    setError('')

    const params = new URLSearchParams({ dia })
    if (frentistaFilter !== 'todos') params.set('frentista', frentistaFilter)

    fetch(`/api/frentista/validacoes?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar validações.')
        return data
      })
      .then((data) => {
        if (!ativo) return
        setLiberacoes(data.liberacoes ?? [])
        setFrentistas(data.frentistas ?? [])
      })
      .catch((e) => {
        if (!ativo) return
        setError(e instanceof Error ? e.message : 'Erro ao carregar validações.')
        setLiberacoes([])
      })
      .finally(() => { if (ativo) setLoading(false) })

    return () => { ativo = false }
  }, [dia, frentistaFilter])

  function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const totalLitros = liberacoes.reduce((s, l) => s + l.litros, 0)
  const totalValor = liberacoes.reduce((s, l) => s + l.valorTotal, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <ClipboardList size={15} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas validações</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Confira todas as liberações realizadas hoje e ontem.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
          {(['hoje', 'ontem'] as Dia[]).map((d) => (
            <button
              key={d}
              onClick={() => setDia(d)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dia === d
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d === 'hoje' ? 'Hoje' : 'Ontem'}
            </button>
          ))}
        </div>

        <select
          value={frentistaFilter}
          onChange={e => setFretistaFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os frentistas</option>
          {frentistas.map(f => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
      </div>

      {/* Conteúdo */}
      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Carregando validações...</p>
        </div>
      ) : liberacoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-2">
          <ClipboardList size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">Nenhuma liberação encontrada</p>
          <p className="text-xs text-gray-400">
            {dia === 'hoje' ? 'Nenhuma liberação registrada hoje.' : 'Nenhuma liberação registrada ontem.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Horário</th>
                  <th className="px-4 py-3 text-left">Frentista</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Placa</th>
                  <th className="px-4 py-3 text-left">Motorista</th>
                  <th className="px-4 py-3 text-left">Combustível</th>
                  <th className="px-4 py-3 text-right">Litros</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {liberacoes.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{formatHora(l.dataHora)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.frentista}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.empresa}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{l.placa}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.motorista}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.combustivel}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{l.litros.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(l.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={6} className="px-4 py-2.5 text-xs font-bold text-gray-600">
                    Total — {liberacoes.length} liberaç{liberacoes.length === 1 ? 'ão' : 'ões'}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-700 text-right">{totalLitros.toFixed(1)} L</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-gray-900 text-right">{formatBRL(totalValor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
