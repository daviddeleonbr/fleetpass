'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Fuel, CheckCircle, ChevronRight, Eye, EyeOff, Building2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const SEGMENTS = [
  'Transportadora', 'Logística', 'Construção Civil', 'Agronegócio',
  'Comércio', 'Prestação de Serviços', 'Outros',
]

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const strength = checks.filter(Boolean).length
  const labels = ['', 'Fraca', 'Regular', 'Boa', 'Forte']
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500']
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? colors[strength] : 'bg-gray-100')} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Senha {labels[strength]}</p>
    </div>
  )
}

export default function CadastroEmpresaPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nomeEmpresa: '', cnpj: '', segmento: '', cidade: '', estado: '',
    nomeCompleto: '', email: '', telefone: '', cargo: '', senha: '', confirmarSenha: '',
  })

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const senhaError = form.confirmarSenha && form.confirmarSenha !== form.senha
    ? 'As senhas não coincidem'
    : undefined

  const step1Valid = !!(form.nomeEmpresa && form.cnpj && form.segmento && form.cidade && form.estado)
  const step2Valid = !!(form.nomeCompleto && form.email && form.senha && form.senha.length >= 6 && !senhaError)

  const handleCriarConta = async () => {
    if (!step2Valid) return
    setError('')
    setLoading(true)
    try {
      // 1. Cria usuário + empresa no banco
      const res = await fetch('/api/cadastro/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCompleto: form.nomeCompleto,
          email:        form.email,
          senha:        form.senha,
          telefone:     form.telefone,
          cargo:        form.cargo,
          nomeEmpresa:  form.nomeEmpresa,
          cnpj:         form.cnpj,
          segmento:     form.segmento,
          cidade:       form.cidade,
          estado:       form.estado,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta. Tente novamente.')
        return
      }

      // 2. Faz login automático
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha,
      })
      if (loginError) {
        // Conta criada mas login falhou — redireciona para login manual
        router.push('/login?cadastro=ok')
        return
      }

      setStep(3)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: 'Empresa' },
    { n: 2, label: 'Responsável' },
    { n: 3, label: 'Concluído' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Fuel size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">FuelLink</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Progress */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              {steps.map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    step > s.n ? 'bg-emerald-500 text-white' :
                    step === s.n ? 'bg-blue-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  )}>
                    {step > s.n ? <CheckCircle size={16} /> : s.n}
                  </div>
                  <span className={cn('text-sm', step === s.n ? 'text-gray-900 font-medium' : 'text-gray-400')}>
                    {s.label}
                  </span>
                  {i < steps.length - 2 && <ChevronRight size={14} className="text-gray-200 mx-1" />}
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((step - 1) / 2) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Step 1 — Dados da empresa */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dados da empresa</h1>
                  <p className="text-sm text-gray-400">Informe os dados da sua empresa.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Nome da empresa"
                  placeholder="TransLog Transportes Ltda."
                  value={form.nomeEmpresa}
                  onChange={(e) => update('nomeEmpresa', e.target.value)}
                />
                <Input
                  label="CNPJ"
                  placeholder="00.000.000/0001-00"
                  value={form.cnpj}
                  onChange={(e) => update('cnpj', e.target.value)}
                  helperText="Somente números, vamos formatar automaticamente"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Segmento</label>
                  <select
                    className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    value={form.segmento}
                    onChange={(e) => update('segmento', e.target.value)}
                  >
                    <option value="">Selecione o segmento</option>
                    {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input
                      label="Cidade"
                      placeholder="São Paulo"
                      value={form.cidade}
                      onChange={(e) => update('cidade', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                    <select
                      className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                      value={form.estado}
                      onChange={(e) => update('estado', e.target.value)}
                    >
                      <option value="">UF</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <Button className="w-full mt-2" onClick={() => setStep(2)} disabled={!step1Valid}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Dados do responsável */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Dados do responsável</h1>
                  <p className="text-sm text-gray-400">Quem vai administrar a conta.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Nome completo"
                  placeholder="João da Silva"
                  value={form.nomeCompleto}
                  onChange={(e) => update('nomeCompleto', e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="joao@translog.com.br"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => update('telefone', e.target.value)}
                  />
                  <Input
                    label="Cargo"
                    placeholder="Gerente de Frota"
                    value={form.cargo}
                    onChange={(e) => update('cargo', e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.senha}
                    onChange={(e) => update('senha', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <PasswordStrength password={form.senha} />
                </div>
                <Input
                  label="Confirmar senha"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmarSenha}
                  onChange={(e) => update('confirmarSenha', e.target.value)}
                  error={senhaError}
                />

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <AlertCircle size={13} className="shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => { setStep(1); setError('') }}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCriarConta}
                    disabled={!step2Valid || loading}
                    isLoading={loading}
                  >
                    Criar conta
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Sucesso */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Conta criada!</h1>
              <p className="text-gray-500 text-sm mb-1">
                Bem-vindo ao FuelLink, <strong>{form.nomeCompleto}</strong>!
              </p>
              <p className="text-gray-400 text-sm mb-8">
                <strong>{form.nomeEmpresa}</strong> está pronta para encontrar postos parceiros.
              </p>
              <Button className="w-full" size="lg" onClick={() => router.push('/empresa')}>
                Ir para o painel
              </Button>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">Entrar</Link>
          </p>
        )}
      </div>
    </div>
  )
}
