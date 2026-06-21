'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Eye, Pencil, CheckCircle2, XCircle } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type EmpresaStatus = 'ativa' | 'inativa' | 'suspensa'

interface Empresa {
  id: string
  nome: string
  cnpj: string
  postosParceiros: number
  requisicoesMes: number
  volumeMes: number
  plano: string
  status: EmpresaStatus
}

const EMPRESAS: Empresa[] = [
  { id: 'E01', nome: 'Transportadora Rápida Ltda', cnpj: '11.222.333/0001-44', postosParceiros: 5, requisicoesMes: 312, volumeMes: 98400, plano: 'Enterprise', status: 'ativa' },
  { id: 'E02', nome: 'Construtora Horizonte S.A.', cnpj: '22.333.444/0001-55', postosParceiros: 3, requisicoesMes: 187, volumeMes: 54200, plano: 'Pro', status: 'ativa' },
  { id: 'E03', nome: 'Distribuidora Central', cnpj: '33.444.555/0001-66', postosParceiros: 2, requisicoesMes: 95, volumeMes: 31500, plano: 'Pro', status: 'ativa' },
  { id: 'E04', nome: 'Grupo Expresso Logística', cnpj: '44.555.666/0001-77', postosParceiros: 8, requisicoesMes: 540, volumeMes: 187300, plano: 'Enterprise', status: 'ativa' },
  { id: 'E05', nome: 'Frota Urbana Serviços', cnpj: '55.666.777/0001-88', postosParceiros: 4, requisicoesMes: 210, volumeMes: 68900, plano: 'Pro', status: 'ativa' },
  { id: 'E06', nome: 'Mineração São Paulo', cnpj: '66.777.888/0001-99', postosParceiros: 1, requisicoesMes: 48, volumeMes: 22700, plano: 'Básico', status: 'suspensa' },
  { id: 'E07', nome: 'Cooperativa Agro Norte', cnpj: '77.888.999/0001-00', postosParceiros: 2, requisicoesMes: 130, volumeMes: 41000, plano: 'Pro', status: 'ativa' },
  { id: 'E08', nome: 'Logística Expressa ME', cnpj: '88.999.000/0001-11', postosParceiros: 1, requisicoesMes: 22, volumeMes: 7800, plano: 'Básico', status: 'ativa' },
  { id: 'E09', nome: 'Terraplanagem Brasil Ltda', cnpj: '99.000.111/0001-22', postosParceiros: 3, requisicoesMes: 78, volumeMes: 25600, plano: 'Pro', status: 'inativa' },
  { id: 'E10', nome: 'Frotas & Cia S.A.', cnpj: '10.111.222/0001-33', postosParceiros: 6, requisicoesMes: 415, volumeMes: 143200, plano: 'Enterprise', status: 'ativa' },
]

const statusBadge: Record<EmpresaStatus, string> = {
  ativa: 'bg-green-50 text-green-700',
  inativa: 'bg-gray-100 text-gray-600',
  suspensa: 'bg-red-50 text-red-700',
}

const planoBadge: Record<string, string> = {
  Básico: 'bg-gray-100 text-gray-700',
  Pro: 'bg-indigo-50 text-indigo-700',
  Enterprise: 'bg-purple-50 text-purple-700',
}

type FilterStatus = 'todos' | 'ativas' | 'inativas' | 'suspensas'

export default function EmpresasAdminPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos')

  const filtered = EMPRESAS.filter((e) => {
    const matchSearch =
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj.includes(search)
    const matchStatus =
      filterStatus === 'todos' ? true
      : filterStatus === 'ativas' ? e.status === 'ativa'
      : filterStatus === 'inativas' ? e.status === 'inativa'
      : e.status === 'suspensa'
    return matchSearch && matchStatus
  })

  const tabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'todos', label: 'Todas', count: EMPRESAS.length },
    { key: 'ativas', label: 'Ativas', count: EMPRESAS.filter(e => e.status === 'ativa').length },
    { key: 'inativas', label: 'Inativas', count: EMPRESAS.filter(e => e.status === 'inativa').length },
    { key: 'suspensas', label: 'Suspensas', count: EMPRESAS.filter(e => e.status === 'suspensa').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie todas as empresas cadastradas na plataforma</p>
        </div>
        <Button variant="primary" size="md">+ Adicionar empresa</Button>
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-4 border-b -mb-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  filterStatus === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Postos parceiros</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Req./mês</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Volume R$/mês</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{e.nome}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{e.cnpj}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">{e.postosParceiros}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">{e.requisicoesMes.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatBRL(e.volumeMes)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planoBadge[e.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                      {e.plano}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver detalhes">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar">
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">Nenhuma empresa encontrada</div>
          )}
        </div>
      </Card>
    </div>
  )
}
