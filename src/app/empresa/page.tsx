import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus, Truck, Mail, CheckCircle2, Handshake, Clock, FilePlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const metrics = [
  { label: 'Abastecimentos este mês', value: '47', change: '+12%', up: true },
  { label: 'Gasto total', value: 'R$ 12.840', change: '+8%', up: true },
  { label: 'Requisições abertas', value: '8', change: '3 hoje', up: null },
  { label: 'Postos parceiros', value: '5', change: '1 novo', up: null },
]

const recentActivity = [
  { desc: 'FL-XK9-3P2 validada por Roberto', sub: 'Shell Centro · ABC-1234', time: '14:32', tipo: 'concluido' as const },
  { desc: 'Nova parceria com Ipiranga Leste', sub: 'Contrato ativo desde hoje', time: '11:15', tipo: 'ativo' as const },
  { desc: 'FL-AB4-7R1 expirada sem uso', sub: 'DEF-5678 · Mercedes Sprinter', time: '09:00', tipo: 'expirado' as const },
  { desc: 'João criou requisição FL-MN2-5T8', sub: 'GHI-9012 · Petrobras Sul', time: 'Ontem', tipo: 'pendente' as const },
]

const ACTIVITY_CFG = {
  concluido: { icon: CheckCircle2, iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
  ativo:     { icon: Handshake,    iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  expirado:  { icon: Clock,        iconBg: 'bg-gray-100',    iconColor: 'text-gray-500'    },
  pendente:  { icon: FilePlus,     iconBg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
}

const recentRequests = [
  { id: 'FL-XK9-3P2', veiculo: 'ABC-1234 · Iveco Daily', motorista: 'Roberto Lima', posto: 'Shell Centro', limite: 'R$ 300', status: 'concluido' as const },
  { id: 'FL-AB4-7R1', veiculo: 'DEF-5678 · Mercedes Sprinter', motorista: 'Ana Costa', posto: 'Ipiranga Leste', limite: 'R$ 200', status: 'expirado' as const },
  { id: 'FL-MN2-5T8', veiculo: 'GHI-9012 · Ford Transit', motorista: 'Carlos Santos', posto: 'Shell Centro', limite: 'R$ 450', status: 'pendente' as const },
  { id: 'FL-PQ3-8U0', veiculo: 'JKL-3456 · Iveco Daily', motorista: 'Marcos Alves', posto: 'Petrobras Sul', limite: 'R$ 180', status: 'ativo' as const },
]

const barData = [30, 55, 40, 75, 60, 80, 50, 90, 70, 85, 45, 95]

export default function EmpresaPage() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bom dia, João 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">TransLog Transportes · Plano Starter</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/empresa/requisicoes/nova">
            <Button size="sm">
              <Plus size={14} /> Nova requisição
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} padding="md">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {m.up === true && <TrendingUp size={12} className="text-emerald-500" />}
              {m.up === false && <TrendingDown size={12} className="text-red-500" />}
              <span className={`text-xs font-medium ${m.up === true ? 'text-emerald-600' : m.up === false ? 'text-red-500' : 'text-gray-400'}`}>
                {m.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Gastos por semana</h3>
            <span className="text-xs text-gray-400">Últimas 12 semanas</span>
          </div>
          <div className="flex items-end gap-1.5 h-36">
            {barData.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Jan', 'Fev', 'Mar'].map((m) => (
              <span key={m} className="text-xs text-gray-300">{m}</span>
            ))}
          </div>
        </Card>

        <Card padding="none">
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Atividade recente</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map((a, i) => {
              const cfg = ACTIVITY_CFG[a.tipo]
              const Icon = cfg.icon
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={15} className={cfg.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{a.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.sub}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 mt-1">{a.time}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/empresa/requisicoes/nova">
          <Button variant="secondary" size="sm">
            <Plus size={14} /> Nova requisição
          </Button>
        </Link>
        <Link href="/empresa/frota/veiculos">
          <Button variant="secondary" size="sm">
            <Truck size={14} /> Cadastrar veículo
          </Button>
        </Link>
        <Link href="/empresa/convites">
          <Button variant="secondary" size="sm">
            <Mail size={14} /> Convites
          </Button>
        </Link>
      </div>

      {/* Recent requisitions table */}
      <Card padding="none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Requisições recentes</h3>
          <Link href="/empresa/requisicoes" className="text-sm text-blue-600 hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="px-6 py-3 text-left">Código</th>
                <th className="px-6 py-3 text-left">Veículo</th>
                <th className="px-6 py-3 text-left">Motorista</th>
                <th className="px-6 py-3 text-left">Posto</th>
                <th className="px-6 py-3 text-left">Limite</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentRequests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-mono text-gray-700">{r.id}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{r.veiculo}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{r.motorista}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{r.posto}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-700">{r.limite}</td>
                  <td className="px-6 py-3"><Badge variant={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
