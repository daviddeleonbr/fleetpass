'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Fuel, Eye, EyeOff, Building2, Flame, HardHat, Shield, ClipboardCopy, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authenticate, MOCK_USERS, type UserRole } from '@/lib/mock-auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ROLE_REDIRECT: Record<string, string> = {
  empresa:   '/empresa',
  posto:     '/posto',
  frentista: '/frentista/validar',
  motorista: '/empresa',
  admin:     '/admin',
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  empresa: { label: 'Empresa', icon: Building2, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  posto: { label: 'Posto', icon: Flame, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  frentista: { label: 'Frentista', icon: HardHat, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  admin: { label: 'Admin', icon: Shield, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
      {copied ? <Check size={11} className="text-emerald-500" /> : <ClipboardCopy size={11} />}
    </button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Tenta login real no Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (!authError && authData.user) {
      // Busca o perfil para saber o role e redirecionar corretamente
      const { data: perfil } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      const redirect = ROLE_REDIRECT[perfil?.role ?? ''] ?? '/empresa'
      router.push(redirect)
      return
    }

    // 2. Fallback: acessos de demonstração (mock)
    const mockUser = authenticate(email, password)
    if (mockUser) {
      router.push(mockUser.redirect)
      return
    }

    setError('Email ou senha incorretos.')
    setLoading(false)
  }

  const fillCredentials = (userEmail: string, userPassword: string) => {
    setEmail(userEmail)
    setPassword(userPassword)
    setError('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gray-900 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -left-10 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Fuel size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">FuelLink</span>
          </Link>
        </div>

        <div className="relative z-10">
          <p className="text-3xl font-bold text-white leading-snug mb-3">
            Conectando frotas<br />
            <span className="text-blue-400">aos melhores postos.</span>
          </p>
          <p className="text-gray-400 text-sm">
            Gerencie abastecimentos, controle gastos e mantenha sua frota rodando.
          </p>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 300 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-30">
            <rect x="20" y="60" width="60" height="70" rx="4" fill="#3B82F6" />
            <rect x="30" y="40" width="40" height="25" rx="3" fill="#60A5FA" />
            <rect x="40" y="50" width="8" height="12" rx="1" fill="#1D4ED8" />
            <rect x="110" y="80" width="80" height="50" rx="4" fill="#2563EB" />
            <rect x="130" y="60" width="40" height="25" rx="3" fill="#3B82F6" />
            <ellipse cx="125" cy="133" rx="10" ry="5" fill="#1D4ED8" />
            <ellipse cx="175" cy="133" rx="10" ry="5" fill="#1D4ED8" />
            <rect x="220" y="90" width="60" height="40" rx="4" fill="#1E40AF" />
            <rect x="230" y="75" width="30" height="20" rx="3" fill="#2563EB" />
            <line x1="0" y1="133" x2="300" y2="133" stroke="#374151" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Fuel size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">FuelLink</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-gray-500 text-sm mb-6">Entre na sua conta para continuar.</p>

          {/* Demo access cards */}
          <div className="mb-6 p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Acessos de demonstração
            </p>
            {MOCK_USERS.map((user) => {
              const config = roleConfig[user.role]
              const Icon = config.icon
              return (
                <button
                  key={user.email}
                  onClick={() => fillCredentials(user.email, user.password)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg border transition-all hover:shadow-sm',
                    config.bg,
                    email === user.email ? 'ring-2 ring-offset-1 ring-blue-400' : ''
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className={cn('shrink-0 mt-0.5', config.color)} />
                      <div className="min-w-0">
                        <p className={cn('text-xs font-semibold truncate', config.color)}>
                          {config.label}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{user.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">clique para preencher</span>
                  </div>
                  <div className="mt-1.5 flex gap-3 pl-5">
                    <span className="text-[11px] text-gray-500 font-mono flex items-center gap-0.5">
                      {user.email}
                      <CopyButton text={user.email} />
                    </span>
                    <span className="text-[11px] text-gray-400">·</span>
                    <span className="text-[11px] text-gray-500 font-mono flex items-center gap-0.5">
                      {user.password}
                      <CopyButton text={user.password} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link href="/recuperar-senha" className="text-sm text-blue-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-blue-600 font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
