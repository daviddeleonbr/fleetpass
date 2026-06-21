'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Store, Plus, MapPin, Fuel, CheckCircle, ChevronRight,
  X, Pencil, Power, ArrowLeft, Star, TrendingUp, Users,
  Zap, MessageSquare, ThumbsUp, Loader2, AlertCircle, CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const MapPicker = dynamic(
  () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-xs text-gray-400">Carregando mapa…</div> }
)

const COMBUSTIVEIS = [
  'Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S-10', 'Diesel Comum', 'GNV',
]
const BANDEIRAS = ['Shell', 'Ipiranga', 'Petrobras', 'Vibra', 'Raízen', 'Independente']
const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type StatusPosto = 'ativo' | 'inativo'

interface Posto {
  id: string
  nome: string
  cnpj: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  bandeira: string
  combustiveis: string[]
  capacidade: string | null
  status: StatusPosto
  lat?: number | null
  lng?: number | null
  asaas_id: string | null
  asaas_wallet_id: string | null
}

function StarFill({ filled }: { filled: boolean }) {
  return <Star size={13} className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
}

function PainelPosto({ posto, onBack }: { posto: Posto; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={15} /> Meus postos
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">{posto.nome}</span>
      </div>
      <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
          <Store size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{posto.nome}</p>
            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', posto.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
              {posto.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={11} /> {posto.endereco}{posto.numero ? `, ${posto.numero}` : ''} · {posto.cidade}/{posto.estado}
          </p>
        </div>
        {posto.asaas_id && (
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg shrink-0">
            <CheckCircle size={13} className="text-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">Asaas</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-emerald-500" /><p className="text-xs text-gray-500">Receita B2B — Mês atual</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-blue-500" /><p className="text-xs text-gray-500">Abastecimentos — Mês atual</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
        <Card padding="md"><div className="flex items-center gap-2 mb-2"><Users size={14} className="text-purple-500" /><p className="text-xs text-gray-500">Parceiros ativos</p></div><p className="text-2xl font-bold text-gray-900">—</p></Card>
      </div>
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4"><MessageSquare size={15} className="text-gray-500" /><h2 className="font-semibold text-gray-900">Avaliações recebidas</h2></div>
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400"><ThumbsUp size={20} className="opacity-30" /><p className="text-sm">Ainda não há avaliações para este posto.</p></div>
      </Card>
    </div>
  )
}

function emptyForm() {
  return {
    nome: '', cnpj: '', endereco: '', numero: '', complemento: '', bairro: '',
    cidade: '', estado: '', cep: '', bandeira: '', capacidade: '',
    combustiveis: [] as string[],
    lat: null as number | null,
    lng: null as number | null,
  }
}

function emptyAsaasForm() {
  return { email: '', celular: '', tipoEmpresa: 'LIMITED', faturamento: '' }
}

const BRAZIL_CENTER: [number, number] = [-15.7801, -47.9292]

// ── Asaas Modal ──────────────────────────────────────────────────────────────

function AsaasModal({
  posto,
  onClose,
  onSuccess,
}: {
  posto: Posto
  onClose: () => void
  onSuccess: (asaasId: string, walletId: string | null) => void
}) {
  const [form, setForm]         = useState(emptyAsaasForm())
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState('')
  const [emailEmUso, setEmailEmUso] = useState(false)
  const [ok, setOk]             = useState(false)

  const update = (f: string, v: string) => {
    if (f === 'email') setEmailEmUso(false)
    setForm(prev => ({ ...prev, [f]: v }))
  }

  const submit = async () => {
    if (!form.email.trim())   { setErro('Informe o e-mail.'); return }
    if (!form.celular.trim()) { setErro('Informe o celular.'); return }
    if (!form.faturamento || Number(form.faturamento) <= 0) { setErro('Informe o faturamento mensal estimado.'); return }
    setErro('')
    setEmailEmUso(false)
    setSaving(true)
    try {
      const res  = await fetch('/api/asaas/subconta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:        posto.nome,
          email:       form.email,
          cpfCnpj:     posto.cnpj,
          tipoEmpresa: form.tipoEmpresa,
          celular:     form.celular,
          cep:         posto.cep,
          endereco:    posto.endereco,
          numero:      posto.numero,
          complemento: '',
          bairro:      posto.bairro,
          cidade:      posto.cidade,
          estado:      posto.estado,
          incomeValue: Number(form.faturamento),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Detecta e-mail já cadastrado no Asaas
        const detail     = data.detail ?? {}
        const erros: { description?: string }[] = Array.isArray(detail?.errors) ? detail.errors : []
        const isEmailUso = erros.some(e => e.description?.toLowerCase().includes('email') && e.description?.toLowerCase().includes('uso'))
          || JSON.stringify(detail).toLowerCase().includes('email') && JSON.stringify(detail).toLowerCase().includes('uso')
        if (isEmailUso) {
          setEmailEmUso(true)
          setErro('Este e-mail já está cadastrado no Asaas. Informe outro endereço de e-mail.')
          return
        }
        const msg = typeof detail === 'string' ? detail : JSON.stringify(detail)
        setErro((data.error ?? 'Erro ao criar carteira.') + (msg ? ` — ${msg}` : ''))
        return
      }
      setOk(true)
      onSuccess(data.id, data.walletId ?? null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard size={17} className="text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">
                {ok ? 'Carteira ativada!' : 'Ativar carteira'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={18} /></button>
          </div>

          <div className="px-6 py-6">
            {ok ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Carteira criada!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>{posto.nome}</strong> agora pode fechar faturas e acompanhar pagamentos.
                  </p>
                </div>
                <Button className="w-full" onClick={onClose}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dados do posto (read-only) */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Dados do posto</p>
                  <p className="text-sm font-semibold text-gray-800">{posto.nome}</p>
                  <p className="text-xs text-gray-500 font-mono">{posto.cnpj}</p>
                  <p className="text-xs text-gray-500">{posto.endereco}{posto.numero ? `, ${posto.numero}` : ''} — {posto.bairro}, {posto.cidade}/{posto.estado}</p>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail do posto</label>
                  <input
                    type="email"
                    placeholder="contato@posto.com.br"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    className={cn(
                      'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                      emailEmUso
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-50'
                    )}
                  />
                  {emailEmUso && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <span>Este e-mail já está cadastrado no Asaas. Por favor, informe outro endereço de e-mail para este posto.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Celular / Telefone" placeholder="(11) 99999-9999" value={form.celular} onChange={e => update('celular', e.target.value)} />
                  <Input label="Faturamento mensal (R$)" type="number" placeholder="50000" value={form.faturamento} onChange={e => update('faturamento', e.target.value)} helperText="Receita bruta estimada" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de empresa</label>
                  <select className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50" value={form.tipoEmpresa} onChange={e => update('tipoEmpresa', e.target.value)}>
                    <option value="LIMITED">Ltda / S.A.</option>
                    <option value="MEI">MEI</option>
                    <option value="INDIVIDUAL">Empresário Individual</option>
                    <option value="ASSOCIATION">Associação</option>
                  </select>
                </div>
                {erro && !emailEmUso && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</div>
                )}
                <div className="flex gap-3 pt-1">
                  <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                  <Button className="flex-1" onClick={submit} disabled={saving} isLoading={saving}>Ativar carteira</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MeusPostosPage() {
  const [postos, setPostos]       = useState<Posto[]>([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Modal cadastro/edição
  const [showModal, setShowModal]   = useState(false)
  const [modalStep, setModalStep]   = useState(1)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState(emptyForm())
  const [savingPosto, setSavingPosto] = useState(false)
  const [formErro, setFormErro]     = useState('')

  // Modal Asaas
  const [asaasPosto, setAsaasPosto] = useState<Posto | null>(null)

  const [painelPosto, setPainelPosto] = useState<Posto | null>(null)

  const fetchPostos = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res  = await fetch('/api/posto/meus-postos')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar postos.')
      setPostos(data.postos)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erro ao buscar postos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPostos() }, [fetchPostos])

  const update    = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))
  const toggleFuel = (fuel: string) => setForm(f => ({
    ...f,
    combustiveis: f.combustiveis.includes(fuel)
      ? f.combustiveis.filter(c => c !== fuel)
      : [...f.combustiveis, fuel],
  }))

  const toggleStatus = async (id: string) => {
    try {
      const res  = await fetch('/api/posto/meus-postos/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPostos(prev => prev.map(p => p.id === id ? { ...p, status: data.posto.status } : p))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status.')
    }
  }

  const openModal = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalStep(1)
    setFormErro('')
    setShowModal(true)
  }

  const openEditModal = (p: Posto) => {
    setEditingId(p.id)
    setForm({ ...emptyForm(), nome: p.nome, cnpj: p.cnpj, endereco: p.endereco, numero: p.numero, bairro: p.bairro, cidade: p.cidade, estado: p.estado, cep: p.cep, bandeira: p.bandeira, capacidade: p.capacidade ?? '', combustiveis: [...p.combustiveis], lat: p.lat ?? null, lng: p.lng ?? null })
    setModalStep(1)
    setFormErro('')
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  // Salva edição
  const salvarEditar = async () => {
    setSavingPosto(true)
    setFormErro('')
    try {
      const res  = await fetch('/api/posto/meus-postos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, nome: form.nome, cnpj: form.cnpj, bandeira: form.bandeira, endereco: form.endereco, numero: form.numero, complemento: form.complemento || null, bairro: form.bairro, cidade: form.cidade, estado: form.estado, cep: form.cep, combustiveis: form.combustiveis, capacidade: form.capacidade || null, lat: form.lat, lng: form.lng }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPostos(prev => prev.map(p => p.id === editingId ? { ...p, ...data.posto } : p))
      closeModal()
    } catch (err) {
      setFormErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSavingPosto(false)
    }
  }

  // Salva novo posto (sem Asaas)
  const salvarPosto = async () => {
    setSavingPosto(true)
    setFormErro('')
    try {
      const res  = await fetch('/api/posto/meus-postos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: form.nome, cnpj: form.cnpj, bandeira: form.bandeira, endereco: form.endereco, numero: form.numero, complemento: form.complemento || null, bairro: form.bairro, cidade: form.cidade, estado: form.estado, cep: form.cep, combustiveis: form.combustiveis, capacidade: form.capacidade || null, lat: form.lat, lng: form.lng }) })
      const data = await res.json()
      if (!res.ok) { setFormErro(data.error ?? 'Erro ao criar posto.'); return }
      setPostos(prev => [...prev, data.posto])
      setModalStep(5) // tela de sucesso
    } finally {
      setSavingPosto(false)
    }
  }

  const ativos = postos.filter(p => p.status === 'ativo').length

  if (painelPosto) {
    return <PainelPosto posto={painelPosto} onBack={() => setPainelPosto(null)} />
  }

  const STEPS = [
    { n: 1, label: 'Identificação' },
    { n: 2, label: 'Endereço' },
    { n: 3, label: 'Localização' },
    { n: 4, label: 'Combustíveis' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Store size={15} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Postos</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {loading ? 'Carregando…' : `${ativos} de ${postos.length} posto${postos.length !== 1 ? 's' : ''} ativo${ativos !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <Button size="sm" onClick={openModal}><Plus size={14} /> Adicionar posto</Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin" /><span className="text-sm">Carregando postos…</span>
        </div>
      )}

      {!loading && fetchError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" /> {fetchError}
        </div>
      )}

      {!loading && !fetchError && postos.length === 0 && (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">Nenhum posto cadastrado</p>
            <p className="text-xs text-gray-400">Clique em "Adicionar posto" para começar.</p>
            <Button size="sm" onClick={openModal} className="mt-2"><Plus size={14} /> Adicionar primeiro posto</Button>
          </div>
        </Card>
      )}

      {!loading && !fetchError && postos.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {postos.map(p => (
            <Card key={p.id} padding="none">
              <div className="flex items-stretch">
                <div className={cn('w-1.5 rounded-l-xl shrink-0', p.status === 'ativo' ? 'bg-emerald-400' : 'bg-gray-200')} />
                <div className="flex-1 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900">{p.nome}</h3>
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', p.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200')}>
                          {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                        {p.asaas_id
                          ? <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">Asaas</span>
                          : <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">Sem faturamento</span>
                        }
                      </div>
                      <p className="text-xs font-mono text-gray-400 mb-3">{p.cnpj}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{p.endereco}{p.numero ? `, ${p.numero}` : ''} · {p.cidade}/{p.estado}</span>
                        <span className="flex items-center gap-1"><Fuel size={12} className="text-gray-400" />{p.bandeira}</span>
                        {p.capacidade && <><span className="text-gray-300">·</span><span>{p.capacidade} L/mês est.</span></>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.combustiveis.map(c => (
                          <span key={c} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!p.asaas_id && (
                        <button
                          onClick={() => setAsaasPosto(p)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors"
                        >
                          <CreditCard size={12} /> Ativar carteira
                        </button>
                      )}
                      <button onClick={() => toggleStatus(p.id)} className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors', p.status === 'ativo' ? 'text-gray-400 hover:text-red-500 border-gray-200 hover:border-red-200' : 'text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-400')}>
                        <Power size={12} />{p.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => openEditModal(p)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setPainelPosto(p)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors font-medium">
                        Ver painel <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Store size={17} className="text-amber-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {modalStep === 5 ? 'Posto adicionado!' : editingId ? 'Editar posto' : 'Adicionar posto'}
                  </span>
                </div>
                <button onClick={closeModal} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={18} /></button>
              </div>

              {/* Step indicator (steps 1-4) */}
              {modalStep <= 4 && (
                <div className="px-6 pt-4">
                  <div className="flex items-center gap-1 mb-4">
                    {STEPS.map((s, i) => (
                      <div key={s.n} className="flex items-center gap-1">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors shrink-0', modalStep > s.n ? 'bg-emerald-500 text-white' : modalStep === s.n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400')}>
                          {modalStep > s.n ? <CheckCircle size={13} /> : s.n}
                        </div>
                        <span className={cn('text-xs whitespace-nowrap', modalStep === s.n ? 'text-gray-900 font-medium' : 'text-gray-400')}>{s.label}</span>
                        {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-200 mx-1" />}
                      </div>
                    ))}
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full mb-5">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((modalStep - 1) / 3) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="px-6 pb-6">
                {/* Step 1 — Identificação */}
                {modalStep === 1 && (
                  <div className="space-y-4">
                    <Input label="Nome do posto" placeholder="Shell — Bairro / Cidade" value={form.nome} onChange={e => update('nome', e.target.value)} />
                    <Input label="CNPJ" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => update('cnpj', e.target.value)} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Bandeira</label>
                      <select className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50" value={form.bandeira} onChange={e => update('bandeira', e.target.value)}>
                        <option value="">Selecione a bandeira</option>
                        {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
                      <Button className="flex-1" onClick={() => setModalStep(2)} disabled={!form.nome || !form.cnpj}>Continuar</Button>
                    </div>
                  </div>
                )}

                {/* Step 2 — Endereço */}
                {modalStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2"><Input label="Endereço (rua/av.)" placeholder="Av. Paulista" value={form.endereco} onChange={e => update('endereco', e.target.value)} /></div>
                      <Input label="Número" placeholder="1000" value={form.numero} onChange={e => update('numero', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Bairro" placeholder="Centro" value={form.bairro} onChange={e => update('bairro', e.target.value)} />
                      <Input label="Complemento" placeholder="(opcional)" value={form.complemento} onChange={e => update('complemento', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2"><Input label="Cidade" placeholder="São Paulo" value={form.cidade} onChange={e => update('cidade', e.target.value)} /></div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                        <select className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50" value={form.estado} onChange={e => update('estado', e.target.value)}>
                          <option value="">UF</option>
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <Input label="CEP" placeholder="00000-000" value={form.cep} onChange={e => update('cep', e.target.value)} />
                    <div className="flex gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={() => setModalStep(1)}>Voltar</Button>
                      <Button className="flex-1" onClick={() => setModalStep(3)} disabled={!form.cidade || !form.estado}>Continuar</Button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Localização */}
                {modalStep === 3 && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Clique no mapa ou arraste o pin para marcar a localização exata do posto.</p>
                    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 320 }}>
                      <MapPicker lat={form.lat ?? BRAZIL_CENTER[0]} lng={form.lng ?? BRAZIL_CENTER[1]} onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} />
                    </div>
                    {form.lat && <p className="text-[11px] text-gray-400 font-mono">{form.lat.toFixed(6)}, {form.lng?.toFixed(6)}</p>}
                    <div className="flex gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={() => setModalStep(2)}>Voltar</Button>
                      <Button className="flex-1" onClick={() => setModalStep(4)}>Continuar</Button>
                    </div>
                  </div>
                )}

                {/* Step 4 — Combustíveis */}
                {modalStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Combustíveis disponíveis</label>
                      <div className="flex flex-wrap gap-2">
                        {COMBUSTIVEIS.map(fuel => (
                          <button key={fuel} type="button" onClick={() => toggleFuel(fuel)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors', form.combustiveis.includes(fuel) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600')}>{fuel}</button>
                        ))}
                      </div>
                      {form.combustiveis.length === 0 && <p className="text-xs text-gray-400 mt-2">Selecione ao menos um combustível.</p>}
                    </div>
                    <Input label="Capacidade estimada (L/mês)" type="number" placeholder="50000" value={form.capacidade} onChange={e => update('capacidade', e.target.value)} helperText="Volume estimado de combustível vendido por mês" />
                    {formErro && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formErro}</div>}
                    <div className="flex gap-3 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={() => setModalStep(3)}>Voltar</Button>
                      <Button
                        className="flex-1"
                        onClick={editingId ? salvarEditar : salvarPosto}
                        disabled={form.combustiveis.length === 0 || savingPosto}
                        isLoading={savingPosto}
                      >
                        {editingId ? <><CheckCircle size={14} /> Salvar alterações</> : 'Finalizar cadastro'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 5 — Sucesso */}
                {modalStep === 5 && (
                  <div className="text-center py-2 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Posto adicionado!</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        <strong>{form.nome}</strong> já está ativo e pode receber solicitações de parceria.
                      </p>
                    </div>

                    {/* CTA Asaas opcional */}
                    <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-amber-800">Faturamento automático (opcional)</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Ative a carteira digital para receber pagamentos de faturas e transferir para sua conta bancária.
                      </p>
                      <button
                        onClick={() => {
                          closeModal()
                          const novoP = postos[postos.length - 1]
                          if (novoP) setAsaasPosto(novoP)
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 transition-colors"
                      >
                        <CreditCard size={12} /> Ativar carteira agora
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      <Button className="w-full" onClick={openModal}><Plus size={14} /> Adicionar outro posto</Button>
                      <button onClick={closeModal} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Fechar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Asaas */}
      {asaasPosto && (
        <AsaasModal
          posto={asaasPosto}
          onClose={() => setAsaasPosto(null)}
          onSuccess={(asaasId, walletId) => {
            setPostos(prev => prev.map(p => p.id === asaasPosto.id ? { ...p, asaas_id: asaasId, asaas_wallet_id: walletId } : p))
          }}
        />
      )}
    </div>
  )
}
