'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Fuel, Eye, EyeOff, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authenticate } from '@/lib/mock-auth'

export default function FrenistaLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    await new Promise((r) => setTimeout(r, 600))

    const user = authenticate(credential, password)
    if (user && user.role === 'frentista') {
      router.push('/frentista/validar')
    } else if (user) {
      setError('Este acesso não é de frentista. Use a tela de login principal.')
      setLoading(false)
    } else {
      setError('Credenciais inválidas. Verifique email e senha.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Fuel size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">FuelLink</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-700 mt-3">Acesso Frentista</h1>
          <p className="text-sm text-gray-400 mt-1">Entre com suas credenciais para validar abastecimentos.</p>
        </div>

        {/* Demo hint */}
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-xs text-emerald-700 font-medium">Acesso de demonstração</p>
          <p className="text-[11px] text-emerald-600 font-mono mt-0.5">
            roberto@shellcentro.com.br · frentista123
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="CPF ou Email"
              placeholder="000.000.000-00 ou email@posto.com"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
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
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
          <MapPin size={14} className="text-blue-400" />
          <span>Posto detectado: <strong className="text-gray-600">Shell — Centro</strong></span>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Não é frentista?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login principal
          </Link>
        </p>
      </div>
    </div>
  )
}
