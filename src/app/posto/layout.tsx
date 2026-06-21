'use client'

import { SidebarPosto } from '@/components/layout/sidebar-posto'
import { Topbar } from '@/components/layout/topbar'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    posto: 'Posto',
    parcerias: 'Parcerias',
    solicitacoes: 'Solicitações',
    ativos: 'Parceiros ativos',
    frentistas: 'Frentistas',
    requisicoes: 'Requisições',
    faturamento: 'Faturamento',
    financeiro: 'Financeiro',
    historico: 'Histórico',
    relatorios: 'Relatórios',
    empresas: 'Por Empresa',
    combustiveis: 'Por Combustível',
    periodo: 'Por Período',
    configuracoes: 'Configurações',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || decodeURIComponent(seg).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function PostoLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden"><SidebarPosto /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden"><Topbar breadcrumb={breadcrumb} /></div>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
