'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import {
  Store, Building2, FileText, Droplets, TrendingUp,
  DollarSign, Receipt, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface DashboardData {
  kpis: {
    totalPostos: number; totalEmpresas: number; requisicoesMes: number; volumeMes: number
    gmvMes: number; receitaMes: number; faturas: number; taxaPct: number
  }
  volumeCombustivel: { tipo: string; percentual: number }[]
  crescimentoPostos: { mes: string; valor: number }[]
  recentTxs: { id: string; empresa: string; posto: string; valor: number; data: string; status: string }[]
}

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
}

const barColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-red-400', 'bg-cyan-500']
const statusTxBadge: Record<string, string> = {
  faturado: 'bg-green-50 text-green-700',
  pendente: 'bg-amber-50 text-amber-700',
  contestado: 'bg-red-50 text-red-700',
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-gray-400">
        <Loader2 size={22} className="animate-spin" /> <span className="text-sm">Carregando dashboard…</span>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="py-12 text-center text-sm text-red-500 flex items-center justify-center gap-2">
        <AlertTriangle size={16} /> {error || 'Erro ao carregar.'}
      </div>
    )
  }

  const k = data.kpis
  const kpiRow1 = [
    { label: 'Total Postos', value: String(k.totalPostos), icon: Store, color: 'indigo' },
    { label: 'Total Empresas', value: String(k.totalEmpresas), icon: Building2, color: 'blue' },
    { label: 'Requisições/mês', value: k.requisicoesMes.toLocaleString('pt-BR'), icon: FileText, color: 'green' },
    { label: 'Volume/mês', value: `${k.volumeMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`, icon: Droplets, color: 'cyan' },
  ]
  const kpiRow2 = [
    { label: 'GMV/mês', value: formatBRL(k.gmvMes), icon: TrendingUp, color: 'emerald' },
    { label: `Receita FuelLink (${k.taxaPct}%)`, value: formatBRL(k.receitaMes), icon: DollarSign, color: 'indigo' },
    { label: 'Faturas', value: String(k.faturas), icon: Receipt, color: 'amber' },
  ]
  const maxPosto = Math.max(1, ...data.crescimentoPostos.map(d => d.valor))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral da plataforma FuelLink</p>
      </div>

      {[kpiRow1, kpiRow2].map((row, ri) => (
        <div key={ri} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {row.map((kpi) => {
            const c = colorMap[kpi.color]
            return (
              <Card key={kpi.label}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${c.text}`}>{kpi.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    <kpi.icon size={20} className={c.icon} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ))}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Crescimento de postos" subtitle="Acumulado — últimos 6 meses" />
          <div className="flex items-end gap-3 h-36 mt-2">
            {data.crescimentoPostos.map((d) => (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-indigo-700">{d.valor}</span>
                <div className="w-full bg-indigo-500 rounded-t-md transition-all"
                  style={{ height: `${(d.valor / maxPosto) * 100}px` }} />
                <span className="text-xs text-gray-500 capitalize">{d.mes}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Volume por combustível" subtitle="Distribuição do mês" />
          {data.volumeCombustivel.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Sem abastecimentos no mês.</div>
          ) : (
            <div className="space-y-3 mt-2">
              {data.volumeCombustivel.map((v, i) => (
                <div key={v.tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{v.tipo}</span>
                    <span className="font-semibold text-gray-900">{v.percentual}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`${barColors[i % barColors.length]} h-2.5 rounded-full transition-all`}
                      style={{ width: `${v.percentual}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Transações recentes</h3>
              <p className="text-sm text-gray-500 mt-0.5">Últimos 10 abastecimentos</p>
            </div>
            {data.recentTxs.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">Nenhuma transação ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Posto</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{tx.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[160px] truncate">{tx.empresa}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{tx.posto}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(tx.valor)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{tx.data}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusTxBadge[tx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Alertas" subtitle="Itens que precisam de atenção" />
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-green-50">
                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">Tudo em ordem</p>
                  <p className="text-xs mt-0.5 text-green-600">Sem alertas pendentes.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
