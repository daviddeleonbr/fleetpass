'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Search, Eye, AlertCircle, Loader2 } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Empresa {
  id: string
  nome: string
  cnpj: string
  postosParceiros: number
  requisicoesMes: number
  volumeMes: number
  status: 'ativa'
}

export default function EmpresasAdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/empresas')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setEmpresas(d.empresas ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = empresas.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todas as transportadoras cadastradas na plataforma</p>
        </div>
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{empresas.length}</span> empresa{empresas.length !== 1 ? 's' : ''}
          </span>
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

        {error ? (
          <div className="py-12 text-center text-sm text-red-500 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando empresas…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Postos parceiros</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Req./mês</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Volume R$/mês</th>
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ativa
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver detalhes">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400">
                {empresas.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada'}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
