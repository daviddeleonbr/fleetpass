'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Fuel, Eye, EyeOff, Store, Info, Check, AlertCircle, Globe, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ─── Plans ─────────────────────────────────────────────────────────────────

type Plan = {
  id: string
  stripeProductId: string
  stripePriceId: string
  nome: string
  descricao: string
  valor: number
  maxPostos: string | null
  popular: boolean
}

// ─── Step indicator ─────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === step ? 'w-8 bg-blue-600' : n < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">Passo {step} de 2</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CadastroPostoPage() {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cargo: '', senha: '', confirmarSenha: '',
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    fetch('/api/planos')
      .then(r => r.json())
      .then(data => {
        if (data.planos?.length) {
          setPlans(data.planos)
          const popular = data.planos.find((p: Plan) => p.popular)
          setSelectedPlan(popular?.id ?? data.planos[0].id)
        } else {
          setPlansError('Nenhum plano disponível no momento.')
        }
      })
      .catch(() => setPlansError('Erro ao carregar planos. Tente novamente.'))
      .finally(() => setPlansLoading(false))
  }, [])

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const senhaError = form.confirmarSenha && form.confirmarSenha !== form.senha
    ? 'As senhas não coincidem'
    : undefined

  const step1Valid = form.nome && form.email && form.senha && !senhaError

  async function handleAssinar() {
    setCheckoutError('')
    setLoading(true)
    try {
      // 1. Cria usuário no Supabase
      const cadastroRes = await fetch('/api/cadastro/posto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:     form.nome,
          email:    form.email,
          senha:    form.senha,
          telefone: form.telefone,
          cargo:    form.cargo,
        }),
      })
      const cadastroData = await cadastroRes.json()
      if (!cadastroRes.ok) {
        setCheckoutError(cadastroData.error ?? 'Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }

      // 2. Inicia checkout no Stripe
      const plan = plans.find(p => p.id === selectedPlan)
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId:       selectedPlan,
          priceId:      plan?.stripePriceId,
          email:        form.email,
          nome:         form.nome,
        }),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok || !checkoutData.url) {
        setCheckoutError(checkoutData.error ?? 'Erro ao iniciar pagamento. Tente novamente.')
        setLoading(false)
        return
      }

      window.location.href = checkoutData.url
    } catch {
      setCheckoutError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Fuel size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">FuelLink</span>
      </Link>

      {/* ── Step 1: dados da conta ───────────────────────────────────────── */}
      {step === 1 && (
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <StepDots step={1} />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <Store size={21} className="text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Criar conta de posto</h1>
                <p className="text-sm text-gray-400">Você cadastra seus postos no painel.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Maria Andrade"
                value={form.nome}
                onChange={(e) => update('nome', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="maria@suaempresa.com.br"
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
                  placeholder="Proprietário"
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
              </div>
              <Input
                label="Confirmar senha"
                type="password"
                placeholder="••••••••"
                value={form.confirmarSenha}
                onChange={(e) => update('confirmarSenha', e.target.value)}
                error={senhaError}
              />

              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Gerencie múltiplos postos</strong> em uma única conta. A cobrança é por CNPJ: cada posto que você adicionar entra na assinatura.
                </p>
              </div>

              <Button
                className="w-full mt-1"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
              >
                Próximo — assinatura
              </Button>
            </div>
          </div>

          <p className="mt-6 text-sm text-gray-400 text-center">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">Entrar</Link>
          </p>
        </div>
      )}

      {/* ── Step 2: seleção de plano ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <StepDots step={2} />

            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Sua assinatura</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Você paga por CNPJ (posto) cadastrado. Comece com o primeiro e adicione quantos quiser
                no painel — cada CNPJ entra na cobrança. Sem teto de postos.
              </p>
            </div>

            {/* Carregando planos */}
            {plansLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Carregando planos…</span>
              </div>
            )}

            {plansError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={15} className="shrink-0" /> {plansError}
              </div>
            )}

            {/* Plan cards */}
            {!plansLoading && !plansError && (
              <>
                <div className={plans.length === 1
                  ? 'mb-6 max-w-sm mx-auto'
                  : `grid gap-4 mb-6 ${plans.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.id
                    const maxLabel = 'Cobrado por CNPJ cadastrado'

                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                              Mais popular
                            </span>
                          </div>
                        )}

                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                          <Store size={17} className="text-blue-500" />
                        </div>

                        <p className="font-semibold text-gray-900 mb-0.5">{plan.nome}</p>
                        <div className="flex items-baseline gap-0.5 mb-1">
                          <span className="text-xs text-gray-400">R$</span>
                          <span className="text-2xl font-bold text-gray-900">
                            {plan.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-gray-400">/CNPJ·mês</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{maxLabel}</p>

                        {plan.descricao && (
                          <p className="text-xs text-gray-400 leading-relaxed">{plan.descricao}</p>
                        )}

                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected plan summary */}
                {(() => {
                  const plan = plans.find((p) => p.id === selectedPlan)
                  if (!plan) return null
                  return (
                    <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                      <div className="flex items-center gap-3">
                        <Globe size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {plan.nome} — R$ {plan.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por CNPJ/mês
                          </p>
                          <p className="text-xs text-gray-400">
                            Começa com 1 CNPJ. Cada novo posto cadastrado soma na cobrança · Cancele quando quiser
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 shrink-0">Sem teto de postos</p>
                    </div>
                  )
                })()}
              </>
            )}

            {checkoutError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={13} className="shrink-0" /> {checkoutError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setStep(1); setCheckoutError('') }}>
                ← Voltar
              </Button>
              <Button className="flex-1" onClick={handleAssinar} isLoading={loading} disabled={!selectedPlan || plansLoading}>
                Assinar e pagar com cartão →
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Pagamento seguro processado pelo Stripe. Você será redirecionado para a página de pagamento.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
