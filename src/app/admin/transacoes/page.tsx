'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type PagtoStatus = 'pago' | 'pendente' | 'contestado'

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
  status: PagtoStatus
}

const ALL_TRANSACOES: Transacao[] = [
  { id: 'TX-8821', dataHora: '14/03/2025 09:14', posto: 'Posto Shell Centro', empresa: 'Transportadora Rápida Ltda', combustivel: 'Diesel S10', litros: 250.0, valorBruto: 1250.0, taxa: 31.25, valorLiquido: 1218.75, status: 'pago' },
  { id: 'TX-8820', dataHora: '14/03/2025 08:52', posto: 'Posto Ipiranga Norte', empresa: 'Construtora Horizonte S.A.', combustivel: 'Gasolina Comum', litros: 178.1, valorBruto: 890.5, taxa: 22.26, valorLiquido: 868.24, status: 'pago' },
  { id: 'TX-8819', dataHora: '13/03/2025 17:30', posto: 'Posto BR Sul', empresa: 'Distribuidora Central', combustivel: 'Etanol', litros: 176.7, valorBruto: 530.0, taxa: 13.25, valorLiquido: 516.75, status: 'pendente' },
  { id: 'TX-8818', dataHora: '13/03/2025 16:05', posto: 'Posto Shell Centro', empresa: 'Grupo Expresso Logística', combustivel: 'Diesel S10', litros: 420.0, valorBruto: 2100.0, taxa: 52.5, valorLiquido: 2047.5, status: 'pago' },
  { id: 'TX-8817', dataHora: '13/03/2025 14:20', posto: 'Posto Ale Oeste', empresa: 'Frota Urbana Serviços', combustivel: 'GNV', litros: 95.0, valorBruto: 380.0, taxa: 9.5, valorLiquido: 370.5, status: 'pago' },
  { id: 'TX-8816', dataHora: '12/03/2025 11:15', posto: 'Posto Petrobras Leste', empresa: 'Mineração São Paulo', combustivel: 'Diesel S500', litros: 690.0, valorBruto: 3450.0, taxa: 86.25, valorLiquido: 3363.75, status: 'contestado' },
  { id: 'TX-8815', dataHora: '12/03/2025 10:00', posto: 'Posto Shell Centro', empresa: 'Transportadora Rápida Ltda', combustivel: 'Gasolina Aditivada', litros: 134.0, valorBruto: 670.0, taxa: 16.75, valorLiquido: 653.25, status: 'pago' },
  { id: 'TX-8814', dataHora: '11/03/2025 15:45', posto: 'Posto BR Sul', empresa: 'Cooperativa Agro Norte', combustivel: 'Diesel S10', litros: 376.0, valorBruto: 1880.0, taxa: 47.0, valorLiquido: 1833.0, status: 'pago' },
  { id: 'TX-8813', dataHora: '11/03/2025 13:30', posto: 'Posto Ipiranga Norte', empresa: 'Construtora Horizonte S.A.', combustivel: 'Etanol', litros: 140.0, valorBruto: 420.0, taxa: 10.5, valorLiquido: 409.5, status: 'pendente' },
  { id: 'TX-8812', dataHora: '10/03/2025 09:50', posto: 'Posto Shell Centro', empresa: 'Grupo Expresso Logística', combustivel: 'Gasolina Comum', litros: 190.0, valorBruto: 950.0, taxa: 23.75, valorLiquido: 926.25, status: 'pago' },
  { id: 'TX-8811', dataHora: '10/03/2025 08:30', posto: 'Posto Manaus Central', empresa: 'Frotas & Cia S.A.', combustivel: 'Diesel S10', litros: 500.0, valorBruto: 2500.0, taxa: 62.5, valorLiquido: 2437.5, status: 'pago' },
  { id: 'TX-8810', dataHora: '09/03/2025 16:00', posto: 'Posto Ale Oeste', empresa: 'Logística Expressa ME', combustivel: 'Gasolina Comum', litros: 60.0, valorBruto: 300.0, taxa: 7.5, valorLiquido: 292.5, status: 'pago' },
  { id: 'TX-8809', dataHora: '09/03/2025 14:10', posto: 'Posto Shell Centro', empresa: 'Transportadora Rápida Ltda', combustivel: 'Diesel S10', litros: 300.0, valorBruto: 1500.0, taxa: 37.5, valorLiquido: 1462.5, status: 'pago' },
  { id: 'TX-8808', dataHora: '08/03/2025 11:20', posto: 'Posto BR Sul', empresa: 'Cooperativa Agro Norte', combustivel: 'Diesel S500', litros: 280.0, valorBruto: 1400.0, taxa: 35.0, valorLiquido: 1365.0, status: 'pago' },
  { id: 'TX-8807', dataHora: '08/03/2025 09:45', posto: 'Posto Ipiranga Norte', empresa: 'Frotas & Cia S.A.', combustivel: 'Gasolina Aditivada', litros: 220.0, valorBruto: 1100.0, taxa: 27.5, valorLiquido: 1072.5, status: 'pago' },
  { id: 'TX-8806', dataHora: '07/03/2025 17:00', posto: 'Posto Petrobras Leste', empresa: 'Grupo Expresso Logística', combustivel: 'Diesel S10', litros: 600.0, valorBruto: 3000.0, taxa: 75.0, valorLiquido: 2925.0, status: 'pago' },
  { id: 'TX-8805', dataHora: '07/03/2025 15:30', posto: 'Posto Manaus Central', empresa: 'Frota Urbana Serviços', combustivel: 'GNV', litros: 120.0, valorBruto: 480.0, taxa: 12.0, valorLiquido: 468.0, status: 'pendente' },
  { id: 'TX-8804', dataHora: '06/03/2025 10:00', posto: 'Posto Shell Centro', empresa: 'Construtora Horizonte S.A.', combustivel: 'Gasolina Comum', litros: 160.0, valorBruto: 800.0, taxa: 20.0, valorLiquido: 780.0, status: 'pago' },
  { id: 'TX-8803', dataHora: '05/03/2025 14:50', posto: 'Posto Ale Oeste', empresa: 'Transportadora Rápida Ltda', combustivel: 'Diesel S10', litros: 350.0, valorBruto: 1750.0, taxa: 43.75, valorLiquido: 1706.25, status: 'pago' },
  { id: 'TX-8802', dataHora: '05/03/2025 09:30', posto: 'Posto BR Sul', empresa: 'Frotas & Cia S.A.', combustivel: 'Etanol', litros: 200.0, valorBruto: 600.0, taxa: 15.0, valorLiquido: 585.0, status: 'pago' },
  { id: 'TX-8801', dataHora: '04/03/2025 16:15', posto: 'Posto Ipiranga Norte', empresa: 'Distribuidora Central', combustivel: 'Diesel S10', litros: 400.0, valorBruto: 2000.0, taxa: 50.0, valorLiquido: 1950.0, status: 'pago' },
  { id: 'TX-8800', dataHora: '04/03/2025 11:00', posto: 'Posto Petrobras Leste', empresa: 'Mineração São Paulo', combustivel: 'Diesel S500', litros: 550.0, valorBruto: 2750.0, taxa: 68.75, valorLiquido: 2681.25, status: 'contestado' },
]

const ALL_POSTOS = [...new Set(ALL_TRANSACOES.map(t => t.posto))].sort()
const ALL_EMPRESAS = [...new Set(ALL_TRANSACOES.map(t => t.empresa))].sort()

const statusBadge: Record<PagtoStatus, string> = {
  pago: 'bg-green-50 text-green-700',
  pendente: 'bg-amber-50 text-amber-700',
  contestado: 'bg-red-50 text-red-700',
}

const PAGE_SIZE = 10

export default function TransacoesAdminPage() {
  const [search, setSearch] = useState('')
  const [postoFilter, setPostoFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  const [page, setPage] = useState(1)

  const filtered = ALL_TRANSACOES.filter((t) => {
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
        <p className="text-sm text-gray-500 mt-0.5">Log completo de todas as transações na plataforma</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Buscar por ID</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); handleFilter() }}
                placeholder="TX-XXXX"
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
              {ALL_POSTOS.map(p => <option key={p} value={p}>{p}</option>)}
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
              {ALL_EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data/Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Posto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Combustível</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Litros</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor bruto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxa (2,5%)</th>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination + totals */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex gap-6 text-sm">
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{filtered.length}</span> transações
            </span>
            <span className="text-gray-600">
              Bruto: <span className="font-semibold text-gray-900">{formatBRL(totalBruto)}</span>
            </span>
            <span className="text-red-600">
              Taxas: <span className="font-semibold">− {formatBRL(totalTaxa)}</span>
            </span>
            <span className="text-gray-600">
              Líquido: <span className="font-bold text-gray-900">{formatBRL(totalLiquido)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Página {page} de {Math.max(1, totalPages)}</span>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
