'use client'

import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Bell, ChevronDown, ChevronRight, LogOut, Settings, User, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useNotificacoes } from '@/hooks/use-notificacoes'
import { usePerfilAtual, limparPerfilAtual } from '@/hooks/use-perfil-atual'

interface TopbarProps {
  breadcrumb?: { label: string; href?: string }[]
}

// Rotas do menu do avatar por papel (apenas as que existem hoje)
const MENU_ROTAS: Record<string, { perfil?: string; config?: string }> = {
  posto: { perfil: '/posto/perfil', config: '/posto/configuracoes' },
  admin: { config: '/admin/configuracoes' },
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function Topbar({ breadcrumb = [] }: TopbarProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { items, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes()
  const { perfil } = usePerfilAtual()
  const nome = perfil?.nome ?? '…'
  const iniciais = perfil?.iniciais ?? '·'
  const rotas = MENU_ROTAS[perfil?.role ?? ''] ?? {}

  async function handleLogout() {
    await supabase.auth.signOut()
    limparPerfilAtual()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
            {crumb.href && i < breadcrumb.length - 1 ? (
              <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(i === breadcrumb.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false) }}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-20 max-h-[70vh] flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notificações {naoLidas > 0 && <span className="text-xs text-gray-400 font-normal">· {naoLidas} não {naoLidas === 1 ? 'lida' : 'lidas'}</span>}
                  </h3>
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodasLidas}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Check size={11} /> Marcar todas
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto divide-y divide-gray-50">
                  {items.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Nenhuma notificação.</p>
                  )}
                  {items.map((n) => {
                    const naoLida = !n.lida_em
                    const Conteudo = (
                      <div className={cn('px-4 py-3 cursor-pointer transition-colors relative', naoLida ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50')}>
                        {naoLida && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                        <p className={cn('text-sm', naoLida ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>{n.titulo}</p>
                        {n.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.descricao}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{tempoRelativo(n.created_at)} atrás</p>
                      </div>
                    )
                    const handleClick = () => {
                      if (naoLida) marcarLida(n.id)
                      setNotifOpen(false)
                      if (n.link) router.push(n.link)
                    }
                    return (
                      <div key={n.id} onClick={handleClick}>
                        {Conteudo}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium uppercase">
              {iniciais}
            </div>
            <span className="text-sm font-medium text-gray-700">{nome}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                {rotas.perfil && (
                  <Link href={rotas.perfil} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <User size={15} /> Perfil
                  </Link>
                )}
                {rotas.config && (
                  <Link href={rotas.config} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={15} /> Configurações
                  </Link>
                )}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full">
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
