'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, XCircle, Clock, Search, Download, Eye } from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type NFStatus = 'emitida' | 'cancelada' | 'pendente'

interface NotaFiscal {
  numero: string
  dataEmissao: string
  tomador: string
  cnpjTomador: string
  valor: number
  status: NFStatus
  descricao: string
}

const NOTAS: NotaFiscal[] = [
  { numero: 'NF-000142', dataEmissao: '14/03/2025', tomador: 'Transportadora Rápida Ltda', cnpjTomador: '11.222.333/0001-44', valor: 1250.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000141', dataEmissao: '14/03/2025', tomador: 'Construtora Horizonte S.A.', cnpjTomador: '22.333.444/0001-55', valor: 890.5, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000140', dataEmissao: '13/03/2025', tomador: 'Distribuidora Central', cnpjTomador: '33.444.555/0001-66', valor: 530.0, status: 'pendente', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000139', dataEmissao: '13/03/2025', tomador: 'Grupo Expresso Logística', cnpjTomador: '44.555.666/0001-77', valor: 2100.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000138', dataEmissao: '12/03/2025', tomador: 'Frota Urbana Serviços', cnpjTomador: '55.666.777/0001-88', valor: 380.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000137', dataEmissao: '12/03/2025', tomador: 'Mineração São Paulo', cnpjTomador: '66.777.888/0001-99', valor: 3450.0, status: 'cancelada', descricao: 'Serviço de intermediação — abastecimento (cancelada por contestação)' },
  { numero: 'NF-000136', dataEmissao: '11/03/2025', tomador: 'Cooperativa Agro Norte', cnpjTomador: '77.888.999/0001-00', valor: 1880.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000135', dataEmissao: '10/03/2025', tomador: 'Frotas & Cia S.A.', cnpjTomador: '10.111.222/0001-33', valor: 2500.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000134', dataEmissao: '09/03/2025', tomador: 'Transportadora Rápida Ltda', cnpjTomador: '11.222.333/0001-44', valor: 1500.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000133', dataEmissao: '08/03/2025', tomador: 'Logística Expressa ME', cnpjTomador: '88.999.000/0001-11', valor: 300.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000132', dataEmissao: '07/03/2025', tomador: 'Grupo Expresso Logística', cnpjTomador: '44.555.666/0001-77', valor: 3000.0, status: 'emitida', descricao: 'Serviço de intermediação — abastecimento' },
  { numero: 'NF-000131', dataEmissao: '05/03/2025', tomador: 'Construtora Horizonte S.A.', cnpjTomador: '22.333.444/0001-55', valor: 800.0, status: 'pendente', descricao: 'Serviço de intermediação — abastecimento' },
]

const statusBadge: Record<NFStatus, { cls: string; icon: React.ElementType; label: string }> = {
  emitida: { cls: 'bg-green-50 text-green-700', icon: CheckCircle2, label: 'Emitida' },
  cancelada: { cls: 'bg-red-50 text-red-700', icon: XCircle, label: 'Cancelada' },
  pendente: { cls: 'bg-amber-50 text-amber-700', icon: Clock, label: 'Pendente' },
}

export default function NotasAdminPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NFStatus | 'todos'>('todos')

  const filtered = NOTAS.filter((n) => {
    const matchSearch =
      n.numero.toLowerCase().includes(search.toLowerCase()) ||
      n.tomador.toLowerCase().includes(search.toLowerCase()) ||
      n.cnpjTomador.includes(search)
    const matchStatus = statusFilter === 'todos' ? true : n.status === statusFilter
    return matchSearch && matchStatus
  })

  const emitidas = NOTAS.filter(n => n.status === 'emitida')
  const canceladas = NOTAS.filter(n => n.status === 'cancelada')
  const pendentes = NOTAS.filter(n => n.status === 'pendente')
  const valorTotal = emitidas.reduce((s, n) => s + n.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de NFs emitidas pela plataforma</p>
        </div>
        <Button variant="primary" size="md">
          <FileText size={16} />
          Emitir NF manual
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{emitidas.length}</p>
              <p className="text-sm text-gray-500">Emitidas no mês</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-indigo-700">{formatBRL(valorTotal)}</p>
              <p className="text-sm text-gray-500">Valor total emitido</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendentes.length}</p>
              <p className="text-sm text-gray-500">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{canceladas.length}</p>
              <p className="text-sm text-gray-500">Canceladas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            {(['todos', 'emitida', 'pendente', 'cancelada'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'todos' ? 'Todas' : s.charAt(0).toUpperCase() + s.slice(1) + 's'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar NF, tomador ou CNPJ..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">NF número</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Data emissão</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tomador</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((n) => {
                const badge = statusBadge[n.status]
                return (
                  <tr key={n.numero} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-indigo-700">{n.numero}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{n.dataEmissao}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{n.tomador}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{n.cnpjTomador}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{n.descricao}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatBRL(n.valor)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        <badge.icon size={12} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver NF">
                          <Eye size={16} />
                        </button>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Baixar PDF">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">Nenhuma nota fiscal encontrada</div>
          )}
        </div>
      </Card>
    </div>
  )
}
