'use client'

import { Card, CardHeader } from '@/components/ui/card'
import {
  Store, Building2, FileText, Droplets, TrendingUp,
  DollarSign, Receipt, CreditCard, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const KPI_ROW1 = [
  { label: 'Total Postos', value: '32', icon: Store, color: 'indigo' },
  { label: 'Total Empresas', value: '147', icon: Building2, color: 'blue' },
  { label: 'Requisições/mês', value: '4.832', icon: FileText, color: 'green' },
  { label: 'Volume combustível/mês', value: '284.500 L', icon: Droplets, color: 'cyan' },
]

const KPI_ROW2 = [
  { label: 'GMV/mês', value: formatBRL(1284300), icon: TrendingUp, color: 'emerald' },
  { label: 'Receita FuelLink (2,5%)', value: formatBRL(32107), icon: DollarSign, color: 'indigo' },
  { label: 'Faturas fechadas', value: '89', icon: Receipt, color: 'amber' },
  { label: 'Subcontas Asaas', value: '32', icon: CreditCard, color: 'purple' },
]

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
}

const CRESCIMENTO_POSTOS = [
  { mes: 'Out', valor: 22 },
  { mes: 'Nov', valor: 24 },
  { mes: 'Dez', valor: 25 },
  { mes: 'Jan', valor: 27 },
  { mes: 'Fev', valor: 29 },
  { mes: 'Mar', valor: 32 },
]
const maxPosto = Math.max(...CRESCIMENTO_POSTOS.map(d => d.valor))

const VOLUME_COMBUSTIVEL = [
  { tipo: 'Diesel S10', percentual: 45, color: 'bg-blue-500' },
  { tipo: 'Gasolina Comum', percentual: 28, color: 'bg-green-500' },
  { tipo: 'Etanol', percentual: 16, color: 'bg-amber-500' },
  { tipo: 'GNV', percentual: 7, color: 'bg-purple-500' },
  { tipo: 'Diesel S500', percentual: 4, color: 'bg-red-400' },
]

type TxStatus = 'pago' | 'pendente' | 'contestado'
interface RecentTx {
  id: string
  empresa: string
  posto: string
  valor: number
  data: string
  status: TxStatus
}

const RECENT_TXS: RecentTx[] = [
  { id: 'TX-8821', empresa: 'Transportadora Rápida Ltda', posto: 'Posto Shell Centro', valor: 1250.0, data: '14/03/2025 09:14', status: 'pago' },
  { id: 'TX-8820', empresa: 'Construtora Horizonte S.A.', posto: 'Posto Ipiranga Norte', valor: 890.5, data: '14/03/2025 08:52', status: 'pago' },
  { id: 'TX-8819', empresa: 'Distribuidora Central', posto: 'Posto BR Sul', valor: 530.0, data: '13/03/2025 17:30', status: 'pendente' },
  { id: 'TX-8818', empresa: 'Grupo Expresso Logística', posto: 'Posto Shell Centro', valor: 2100.0, data: '13/03/2025 16:05', status: 'pago' },
  { id: 'TX-8817', empresa: 'Frota Urbana Serviços', posto: 'Posto Ale Oeste', valor: 380.0, data: '13/03/2025 14:20', status: 'pago' },
  { id: 'TX-8816', empresa: 'Mineração São Paulo', posto: 'Posto Petrobras Leste', valor: 3450.0, data: '12/03/2025 11:15', status: 'contestado' },
  { id: 'TX-8815', empresa: 'Transportadora Rápida Ltda', posto: 'Posto Shell Centro', valor: 670.0, data: '12/03/2025 10:00', status: 'pago' },
  { id: 'TX-8814', empresa: 'Cooperativa Agro Norte', posto: 'Posto BR Sul', valor: 1880.0, data: '11/03/2025 15:45', status: 'pago' },
  { id: 'TX-8813', empresa: 'Construtora Horizonte S.A.', posto: 'Posto Ipiranga Norte', valor: 420.0, data: '11/03/2025 13:30', status: 'pendente' },
  { id: 'TX-8812', empresa: 'Grupo Expresso Logística', posto: 'Posto Shell Centro', valor: 950.0, data: '10/03/2025 09:50', status: 'pago' },
]

const statusTxBadge: Record<TxStatus, string> = {
  pago: 'bg-green-50 text-green-700',
  pendente: 'bg-amber-50 text-amber-700',
  contestado: 'bg-red-50 text-red-700',
}

const ALERTS = [
  { type: 'warning', msg: '4 postos sem subconta Asaas configurada', detail: 'Posto Boa Vista, Posto Campinas 2, Posto Recife Sul, Posto Fortaleza Norte' },
  { type: 'warning', msg: '2 empresas próximas ao limite de crédito', detail: 'Distribuidora Central (92%), Frota Urbana Serviços (88%)' },
  { type: 'error', msg: '1 pagamento em atraso', detail: 'TX-8816 — Mineração São Paulo — R$ 3.450,00 contestado há 2 dias' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral da plataforma FuelLink</p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-4 gap-4">
        {KPI_ROW1.map((kpi) => {
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

      {/* KPI row 2 */}
      <div className="grid grid-cols-4 gap-4">
        {KPI_ROW2.map((kpi) => {
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

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bar chart — posto growth */}
        <Card>
          <CardHeader title="Crescimento de postos" subtitle="Últimos 6 meses" />
          <div className="flex items-end gap-3 h-36 mt-2">
            {CRESCIMENTO_POSTOS.map((d) => (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-indigo-700">{d.valor}</span>
                <div
                  className="w-full bg-indigo-500 rounded-t-md transition-all"
                  style={{ height: `${(d.valor / maxPosto) * 100}px` }}
                />
                <span className="text-xs text-gray-500">{d.mes}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Horizontal bars — volume by fuel */}
        <Card>
          <CardHeader title="Volume por combustível" subtitle="Distribuição percentual — Março 2025" />
          <div className="space-y-3 mt-2">
            {VOLUME_COMBUSTIVEL.map((v) => (
              <div key={v.tipo}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{v.tipo}</span>
                  <span className="font-semibold text-gray-900">{v.percentual}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`${v.color} h-2.5 rounded-full transition-all`}
                    style={{ width: `${v.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent transactions + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Transactions — spans 2 cols */}
        <div className="col-span-2">
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Transações recentes</h3>
              <p className="text-sm text-gray-500 mt-0.5">Últimas 10 transações em todos os postos</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Posto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {RECENT_TXS.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{tx.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[160px] truncate">{tx.empresa}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate">{tx.posto}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatBRL(tx.valor)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{tx.data}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusTxBadge[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Alerts */}
        <div>
          <Card>
            <CardHeader title="Alertas" subtitle="Itens que precisam de atenção" />
            <div className="space-y-3">
              {ALERTS.map((alert, i) => (
                <div
                  key={i}
                  className={`flex gap-3 p-3 rounded-lg ${alert.type === 'error' ? 'bg-red-50' : 'bg-amber-50'}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {alert.type === 'error' ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <Clock size={16} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${alert.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                      {alert.msg}
                    </p>
                    <p className={`text-xs mt-0.5 ${alert.type === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                      {alert.detail}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 p-3 rounded-lg bg-green-50">
                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">27 postos operando normalmente</p>
                  <p className="text-xs mt-0.5 text-green-600">Sem alertas pendentes</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
