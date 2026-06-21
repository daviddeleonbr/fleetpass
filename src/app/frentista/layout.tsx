'use client'

import { SidebarFrentista } from '@/components/layout/sidebar-frentista'
import { Topbar } from '@/components/layout/topbar'
import { usePathname } from 'next/navigation'

function useBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    frentista: 'Frentista',
    validar:   'Validar abastecimento',
    registrar: 'Registrar abastecimento',
    historico: 'Minhas validações',
  }

  return segments.map((seg, i) => ({
    label: labels[seg] || decodeURIComponent(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))
}

export default function FreentistaLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = useBreadcrumb()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SidebarFrentista />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
