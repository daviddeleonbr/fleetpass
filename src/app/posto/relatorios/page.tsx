import Link from 'next/link'
import { Building2, Droplets, CalendarDays, Clock, Users, ArrowRight } from 'lucide-react'

const cards = [
  {
    href: '/posto/relatorios/empresas',
    icon: Building2,
    color: 'bg-blue-50 text-blue-600',
    border: 'border-blue-100',
    title: 'Por Empresa',
    description: 'Volume consumido, receita gerada e quantidade de abastecimentos agrupados por empresa parceira.',
    tags: ['Consumo', 'Receita', 'Ranking'],
  },
  {
    href: '/posto/relatorios/combustiveis',
    icon: Droplets,
    color: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100',
    title: 'Por Combustível',
    description: 'Distribuição de litros vendidos e receita por tipo de combustível no período selecionado.',
    tags: ['Volume', 'Mix', 'Margem'],
  },
  {
    href: '/posto/relatorios/periodo',
    icon: CalendarDays,
    color: 'bg-violet-50 text-violet-600',
    border: 'border-violet-100',
    title: 'Por Período',
    description: 'Consolidado diário e mensal de abastecimentos, volume e receita B2B ao longo do tempo.',
    tags: ['Diário', 'Mensal', 'Evolução'],
  },
  {
    href: '/posto/relatorios/frentistas',
    icon: Users,
    color: 'bg-amber-50 text-amber-600',
    border: 'border-amber-100',
    title: 'Liberações por Frentista',
    description: 'Detalhamento de liberações realizadas por cada frentista: horário, empresa, placa, motorista, litros e valor.',
    tags: ['Frentista', 'Liberações', 'Auditoria'],
  },
  {
    href: '/posto/relatorios/cliente',
    icon: Clock,
    color: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-100',
    title: 'Linha do Tempo do Cliente',
    description: 'Histórico completo da parceria: bloqueios, desbloqueios, faturamentos, motoristas e alterações contratuais.',
    tags: ['Bloqueios', 'Parceria', 'Auditoria'],
  },
]

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm mt-1">
          Emita relatórios analíticos sobre o desempenho B2B do seu posto. Exportação disponível em PDF e Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`group block bg-white rounded-2xl border ${c.border} p-6 hover:shadow-md transition-all duration-150 hover:-translate-y-0.5`}
            >
              <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-4`}>
                <Icon size={20} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center justify-between">
                {c.title}
                <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{c.description}</p>
              <div className="flex gap-1.5 flex-wrap">
                {c.tags.map((t) => (
                  <span key={t} className="text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Dica:</span>{' '}
          Todos os relatórios podem ser exportados em <strong className="text-gray-700">PDF com design profissional</strong> ou em{' '}
          <strong className="text-gray-700">planilha Excel</strong> para análises adicionais.
        </p>
      </div>
    </div>
  )
}
