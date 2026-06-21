'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Transacao {
  id: string
  dataHora: string
  posto: string
  empresa: string
  combustivel: string
  litros: number
  valorBruto: number
  taxa: number
  valorLiquido: number
  status: string
}

const statusBadge: Record<string, string> = {
  faturado: 'bg-green-50 text-green-700',
  pendente: 'bg-amber-50 text-amber-700',
  contestado: 'bg-red-50 text-red-700',
}

const PAGE_SIZE = 10

export default function TransacoesAdminPage() {
  const [txs, setTxs] = useState<Transacao[]>([])
  const [taxaPct, setTaxaPct] = useState(2.5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [postoFilter, setPostoFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/admin/transacoes')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => { setTxs(d.transacoes ?? []); setTaxaPct(d.taxaPct ?? 2.5) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const allPostos = [...new Set(txs.map(t => t.posto))].sort()
  const allEmpresas = [...new Set(txs.map(t => t.empresa))].sort()

  const filtered = txs.filter((t) => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase())
    const matchPosto = postoFilter ? t.posto === postoFilter : true
    const matchEmpresa = empresaFilter ? t.empresa === empresaFilter : true
    return matchSearch && matchPosto && matchEmpresa
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalBruto = filtered.reduce((s, t) => s + t.valorBruto, 0)
  const totalTaxa = filtered.reduce((s, t) => s + t.taxa, 0)
  const totalLiquido = filtered.reduce((s, t) => s + t.valorLiquido, 0)

  const handleFilter = () => setPage(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log completo de todos os abastecimentos na plataforma</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Buscar por código</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); handleFilter() }}
                placeholder="FL-XXX-XXXX"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Posto</label>
            <select
              value={postoFilter}
              onChange={e => { setPostoFilter(e.target.value); handleFilter() }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os postos</option>
              {allPostos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Empresa</label>
            <select
              value={empresaFilter}
              onChange={e => { setEmpresaFilter(e.target.value); handleFilter() }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as empresas</option>
              {allEmpresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => { setSearch(''); setPostoFilter(''); setEmpresaFilter(''); setPage(1) }}
          >
            Limpar filtros
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {error ? (
          <div className="py-12 text-center text-sm text-red-500 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando transações…</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Posto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Combustível</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Litros</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor bruto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxa ({taxaPct}%)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor líquido</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{t.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.dataHora}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[130px] truncate">{t.posto}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[150px] truncate">{t.empresa}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.combustivel}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{t.litros.toLocaleString('pt-BR')} L</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatBRL(t.valorBruto)}</td>
                      <td className="px-4 py-3 text-sm text-red-500 text-right">− {formatBRL(t.taxa)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(t.valorLiquido)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  {txs.length === 0 ? 'Nenhuma transação registrada ainda.' : 'Nenhuma transação encontrada'}
                </div>
              )}
            </div>

            {/* Pagination + totals */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 flex-wrap gap-3">
              <div className="flex gap-6 text-sm flex-wrap">
                <span className="text-gray-600"><span className="font-semibold text-gray-900">{filtered.length}</span> transações</span>
                <span className="text-gray-600">Bruto: <span className="font-semibold text-gray-900">{formatBRL(totalBruto)}</span></span>
                <span className="text-red-600">Taxas: <span className="font-semibold">− {formatBRL(totalTaxa)}</span></span>
                <span className="text-gray-600">Líquido: <span className="font-bold text-gray-900">{formatBRL(totalLiquido)}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Página {page} de {Math.max(1, totalPages)}</span>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
