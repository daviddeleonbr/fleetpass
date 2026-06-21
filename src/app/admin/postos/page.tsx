'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Search, Eye, Pencil, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

type PostoStatus = 'ativo' | 'inativo'

interface Posto {
  id: string
  nome: string
  cidade: string
  uf: string
  cnpj: string
  plano: string
  subcontaId: string | null
  status: PostoStatus
}

type FilterTab = 'todos' | 'ativos' | 'inativos' | 'sem-subconta'

export default function PostosAdminPage() {
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('todos')

  useEffect(() => {
    fetch('/api/admin/postos')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setPostos(d.postos ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = postos.filter((p) => {
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
    { key: 'todos', label: 'Todos', count: postos.length },
    { key: 'ativos', label: 'Ativos', count: postos.filter(p => p.status === 'ativo').length },
    { key: 'inativos', label: 'Inativos', count: postos.filter(p => p.status === 'inativo').length },
    { key: 'sem-subconta', label: 'Sem subconta', count: postos.filter(p => p.subcontaId === null).length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Postos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie todos os postos cadastrados na plataforma</p>
        </div>
      </div>

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

        {error ? (
          <div className="py-12 text-center text-sm text-red-500 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando postos…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cidade/UF</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subconta Asaas</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.cidade}{p.uf ? `, ${p.uf}` : ''}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{p.cnpj}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
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
              <div className="py-12 text-center text-sm text-gray-400">
                {postos.length === 0 ? 'Nenhum posto cadastrado ainda.' : 'Nenhum posto encontrado'}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
