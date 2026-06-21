'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Eye, Pencil, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type PostoStatus = 'ativo' | 'inativo'

interface Posto {
  id: string
  nome: string
  cidade: string
  uf: string
  cnpj: string
  plano: string
  subcontaId: string | null
  saldo: number
  status: PostoStatus
}

const POSTOS: Posto[] = [
  { id: 'P01', nome: 'Posto Shell Centro', cidade: 'São Paulo', uf: 'SP', cnpj: '12.345.678/0001-90', plano: 'Pro', subcontaId: 'acc_a1b2c3d4e5', saldo: 8430.5, status: 'ativo' },
  { id: 'P02', nome: 'Posto Ipiranga Norte', cidade: 'Campinas', uf: 'SP', cnpj: '23.456.789/0001-01', plano: 'Pro', subcontaId: 'acc_f6g7h8i9j0', saldo: 3210.0, status: 'ativo' },
  { id: 'P03', nome: 'Posto BR Sul', cidade: 'Curitiba', uf: 'PR', cnpj: '34.567.890/0001-12', plano: 'Básico', subcontaId: 'acc_k1l2m3n4o5', saldo: 1540.0, status: 'ativo' },
  { id: 'P04', nome: 'Posto Ale Oeste', cidade: 'Porto Alegre', uf: 'RS', cnpj: '45.678.901/0001-23', plano: 'Enterprise', subcontaId: 'acc_p6q7r8s9t0', saldo: 15200.0, status: 'ativo' },
  { id: 'P05', nome: 'Posto Petrobras Leste', cidade: 'Rio de Janeiro', uf: 'RJ', cnpj: '56.789.012/0001-34', plano: 'Pro', subcontaId: 'acc_u1v2w3x4y5', saldo: 6750.0, status: 'ativo' },
  { id: 'P06', nome: 'Posto Boa Vista', cidade: 'Boa Vista', uf: 'RR', cnpj: '67.890.123/0001-45', plano: 'Básico', subcontaId: null, saldo: 0, status: 'ativo' },
  { id: 'P07', nome: 'Posto Campinas 2', cidade: 'Campinas', uf: 'SP', cnpj: '78.901.234/0001-56', plano: 'Básico', subcontaId: null, saldo: 0, status: 'ativo' },
  { id: 'P08', nome: 'Posto Recife Sul', cidade: 'Recife', uf: 'PE', cnpj: '89.012.345/0001-67', plano: 'Pro', subcontaId: null, saldo: 0, status: 'inativo' },
  { id: 'P09', nome: 'Posto Fortaleza Norte', cidade: 'Fortaleza', uf: 'CE', cnpj: '90.123.456/0001-78', plano: 'Básico', subcontaId: null, saldo: 0, status: 'inativo' },
  { id: 'P10', nome: 'Posto Manaus Central', cidade: 'Manaus', uf: 'AM', cnpj: '01.234.567/0001-89', plano: 'Enterprise', subcontaId: 'acc_z9a8b7c6d5', saldo: 22300.0, status: 'ativo' },
]

type FilterTab = 'todos' | 'ativos' | 'inativos' | 'sem-subconta'

const planoBadge: Record<string, string> = {
  Básico: 'bg-gray-100 text-gray-700',
  Pro: 'bg-indigo-50 text-indigo-700',
  Enterprise: 'bg-purple-50 text-purple-700',
}

export default function PostosAdminPage() {
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('todos')

  const filtered = POSTOS.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cnpj.includes(search) ||
      p.cidade.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      filterTab === 'todos' ? true
      : filterTab === 'ativos' ? p.status === 'ativo'
      : filterTab === 'inativos' ? p.status === 'inativo'
      : p.subcontaId === null
    return matchSearch && matchTab
  })

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: POSTOS.length },
    { key: 'ativos', label: 'Ativos', count: POSTOS.filter(p => p.status === 'ativo').length },
    { key: 'inativos', label: 'Inativos', count: POSTOS.filter(p => p.status === 'inativo').length },
    { key: 'sem-subconta', label: 'Sem subconta', count: POSTOS.filter(p => p.subcontaId === null).length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Postos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie todos os postos cadastrados na plataforma</p>
        </div>
        <Button variant="primary" size="md">+ Adicionar posto</Button>
      </div>

      {/* Search + filter tabs */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-4 border-b -mb-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  filterTab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterTab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
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
              placeholder="Buscar por nome, CNPJ ou cidade..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cidade/UF</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subconta Asaas</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.cidade}, {p.uf}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{p.cnpj}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planoBadge[p.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.plano}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.subcontaId ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        <span className="text-xs font-mono text-gray-600">{p.subcontaId}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-600 font-medium">Pendente</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {p.subcontaId ? formatBRL(p.saldo) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.status === 'ativo' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <CheckCircle2 size={12} /> ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <XCircle size={12} /> inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver detalhes">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar plano">
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">Nenhum posto encontrado</div>
          )}
        </div>
      </Card>
    </div>
  )
}
