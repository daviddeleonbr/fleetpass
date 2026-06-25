'use client'

import { SidebarEmpresa } from '@/components/layout/sidebar-empresa'
import { Topbar } from '@/components/layout/topbar'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    empresa: 'Empresa',
    convites: 'Convites',
    parcerias: 'Parcerias',
    frota: 'Frota',
    veiculos: 'Veículos',
    motoristas: 'Motoristas',
    requisicoes: 'Requisições',
    nova: 'Nova requisição',
    historico: 'Histórico',
    configuracoes: 'Configurações',
    contrato: 'Contrato',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden"><SidebarEmpresa /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden"><Topbar breadcrumb={breadcrumb} /></div>
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
