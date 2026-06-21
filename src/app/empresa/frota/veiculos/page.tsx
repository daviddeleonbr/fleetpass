'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Gauge, Loader2, AlertCircle,
  ChevronRight, ChevronLeft, Lock, LockOpen, Wrench, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Veiculo {
  id: string
  placa: string
  modelo: string
  combustivel: string
  limiteMensal: number | null
  motoristaPadraoId: string | null
  motoristaNome: string | null
  exigirQuilometragem: boolean
  bloqueado: boolean
  bloqueioTipo: 'manutencao' | 'operacional' | null
}

interface Motorista { id: string; nome: string }

interface BloqueioLog {
  id: string
  acao: 'bloqueio' | 'desbloqueio'
  tipo: 'manutencao' | 'operacional' | null
  motivo: string
  perfil_nome: string
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COMBUSTIVEIS = [
  'Gasolina Comum', 'Gasolina Aditivada', 'Etanol',
  'Diesel S-10', 'Diesel Comum', 'GNV',
]

const FORM_VAZIO = {
  placa: '', modelo: '', combustivel: 'Gasolina Comum',
  limiteMensal: '', motoristaPadraoId: '', exigirQuilometragem: false,
}

const STEPS = ['Identificação', 'Combustível', 'Configurações']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlaca(raw: string): string {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (v.length <= 3) return v
  if (v.length > 4 && /[A-Z]/.test(v[4])) return `${v.slice(0, 7)}`
  return `${v.slice(0, 3)}-${v.slice(3, 7)}`
}

function formatLimite(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VeiculosPage() {
  const [veiculos,   setVeiculos]   = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const [search,     setSearch]     = useState('')
  const [fuelFilter, setFuelFilter] = useState('')

  // Cadastro / edição
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [step,       setStep]       = useState(0)
  const [form,       setForm]       = useState(FORM_VAZIO)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  // Remoção
  const [deleteTarget, setDeleteTarget] = useState<Veiculo | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // Bloqueio
  const [bloqueioTarget, setBloqueioTarget] = useState<Veiculo | null>(null)
  const [bloqueioTipo,   setBloqueioTipo]   = useState<'manutencao' | 'operacional'>('operacional')
  const [bloqueioMotivo, setBloqueioMotivo] = useState('')
  const [bloqueioSaving, setBloqueioSaving] = useState(false)
  const [bloqueioError,  setBloqueioError]  = useState<string | null>(null)

  // Desbloqueio
  const [desbloqueioTarget, setDesbloqueioTarget] = useState<Veiculo | null>(null)
  const [desbloqueioMotivo, setDesbloqueioMotivo] = useState('')
  const [desbloqueioSaving, setDesbloqueioSaving] = useState(false)
  const [desbloqueioError,  setDesbloqueioError]  = useState<string | null>(null)

  // Histórico
  const [historicoTarget,  setHistoricoTarget]  = useState<Veiculo | null>(null)
  const [historico,        setHistorico]        = useState<BloqueioLog[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchVeiculos() {
    try {
      setLoading(true)
      setError(null)
      const [resV, resM] = await Promise.all([
        fetch('/api/empresa/frota/veiculos'),
        fetch('/api/empresa/frota/motoristas'),
      ])
      if (!resV.ok) throw new Error('Erro ao carregar veículos.')
      const { veiculos: v } = await resV.json()
      const { motoristas: m } = resM.ok ? await resM.json() : { motoristas: [] }
      setVeiculos(v ?? [])
      setMotoristas(m ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVeiculos() }, [])

  // ── Cadastro / Edição ──────────────────────────────────────────────────────

  function openAdd() {
    setForm(FORM_VAZIO)
    setEditingId(null)
    setSaveError(null)
    setStep(0)
    setModalOpen(true)
  }

  function openEdit(v: Veiculo) {
    setForm({
      placa:               v.placa,
      modelo:              v.modelo,
      combustivel:         v.combustivel,
      limiteMensal:        v.limiteMensal != null ? String(v.limiteMensal) : '',
      motoristaPadraoId:   v.motoristaPadraoId ?? '',
      exigirQuilometragem: v.exigirQuilometragem,
    })
    setEditingId(v.id)
    setSaveError(null)
    setStep(0)
    setModalOpen(true)
  }

  function update(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function canAdvance() {
    if (step === 0) return form.placa.length >= 7 && form.modelo.trim().length > 0
    if (step === 1) return !!form.combustivel
    return true
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        placa:                form.placa,
        modelo:               form.modelo,
        combustivel:          form.combustivel,
        limite_mensal:        form.limiteMensal ? parseFloat(form.limiteMensal.replace(',', '.')) : null,
        motorista_padrao_id:  form.motoristaPadraoId || null,
        exigir_quilometragem: form.exigirQuilometragem,
      }
      const url    = editingId ? `/api/empresa/frota/veiculos/${editingId}` : '/api/empresa/frota/veiculos'
      const method = editingId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar.')
      setModalOpen(false)
      await fetchVeiculos()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Remoção ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erro ao remover.') }
      setDeleteTarget(null)
      setVeiculos(prev => prev.filter(v => v.id !== deleteTarget.id))
    } catch (err) { console.error(err) } finally { setDeleting(false) }
  }

  // ── Bloqueio ───────────────────────────────────────────────────────────────

  function openBloqueio(v: Veiculo) {
    setBloqueioTarget(v)
    setBloqueioTipo('operacional')
    setBloqueioMotivo('')
    setBloqueioError(null)
  }

  async function handleBloquear() {
    if (!bloqueioTarget) return
    setBloqueioSaving(true)
    setBloqueioError(null)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${bloqueioTarget.id}/bloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: bloqueioTipo, motivo: bloqueioMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao bloquear.')
      setBloqueioTarget(null)
      setVeiculos(prev => prev.map(v =>
        v.id === bloqueioTarget.id ? { ...v, bloqueado: true, bloqueioTipo } : v
      ))
    } catch (err) {
      setBloqueioError(err instanceof Error ? err.message : 'Erro ao bloquear.')
    } finally {
      setBloqueioSaving(false)
    }
  }

  // ── Desbloqueio ────────────────────────────────────────────────────────────

  function openDesbloqueio(v: Veiculo) {
    setDesbloqueioTarget(v)
    setDesbloqueioMotivo('')
    setDesbloqueioError(null)
  }

  async function handleDesbloquear() {
    if (!desbloqueioTarget) return
    setDesbloqueioSaving(true)
    setDesbloqueioError(null)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${desbloqueioTarget.id}/desbloquear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: desbloqueioMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao desbloquear.')
      setDesbloqueioTarget(null)
      setVeiculos(prev => prev.map(v =>
        v.id === desbloqueioTarget.id ? { ...v, bloqueado: false, bloqueioTipo: null } : v
      ))
    } catch (err) {
      setDesbloqueioError(err instanceof Error ? err.message : 'Erro ao desbloquear.')
    } finally {
      setDesbloqueioSaving(false)
    }
  }

  // ── Histórico ──────────────────────────────────────────────────────────────

  async function openHistorico(v: Veiculo) {
    setHistoricoTarget(v)
    setHistorico([])
    setLoadingHistorico(true)
    try {
      const res = await fetch(`/api/empresa/frota/veiculos/${v.id}/bloqueios`)
      const data = await res.json()
      setHistorico(data.logs ?? [])
    } catch { /* silencioso */ } finally {
      setLoadingHistorico(false)
    }
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────

  const filtered = veiculos.filter(v => {
    const q = search.toLowerCase()
    return (
      (!q || v.placa.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q)) &&
      (!fuelFilter || v.combustivel === fuelFilter)
    )
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-500 text-sm">
            {loading ? 'Carregando...' : `${veiculos.length} veículo${veiculos.length !== 1 ? 's' : ''} cadastrado${veiculos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Adicionar veículo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
            placeholder="Buscar por placa ou modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          value={fuelFilter}
          onChange={e => setFuelFilter(e.target.value)}
        >
          <option value="">Todos combustíveis</option>
          {COMBUSTIVEIS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Carregando veículos...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
          <button onClick={fetchVeiculos} className="ml-auto text-red-600 underline text-xs">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && (
        <Card padding="none">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
              <Search size={24} className="text-gray-200" />
              <p className="text-sm font-medium">
                {veiculos.length === 0 ? 'Nenhum veículo cadastrado.' : 'Nenhum veículo encontrado.'}
              </p>
              {veiculos.length === 0 && (
                <button onClick={openAdd} className="text-xs text-blue-500 hover:underline mt-1">Adicionar primeiro veículo</button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3 text-left">Placa</th>
                  <th className="px-6 py-3 text-left">Modelo</th>
                  <th className="px-6 py-3 text-left">Combustível</th>
                  <th className="px-6 py-3 text-left">Limite/mês</th>
                  <th className="px-6 py-3 text-left">Motorista padrão</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${v.bloqueado ? 'bg-gray-50/60' : ''}`}>
                    <td className="px-6 py-3 text-sm font-mono font-medium text-gray-900">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={v.bloqueado ? 'text-gray-400' : ''}>{v.placa}</span>
                        {v.bloqueioTipo === 'manutencao' && (
                          <span className="inline-flex items-center gap-1 text-xs font-sans font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            <Wrench size={10} /> Manutenção
                          </span>
                        )}
                        {v.bloqueado && v.bloqueioTipo === 'operacional' && (
                          <span className="inline-flex items-center gap-1 text-xs font-sans font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                            <Lock size={10} /> Bloqueado
                          </span>
                        )}
                        {!v.bloqueado && v.exigirQuilometragem && (
                          <span title="Exige quilometragem"><Gauge size={13} className="text-blue-500" /></span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{v.modelo}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{v.combustivel}</span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-700">
                      {v.limiteMensal != null ? formatLimite(v.limiteMensal) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {v.motoristaNome ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Bloquear / Desbloquear */}
                        {v.bloqueado ? (
                          <button
                            onClick={() => openDesbloqueio(v)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desbloquear veículo"
                          >
                            <LockOpen size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBloqueio(v)}
                            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Bloquear veículo"
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {/* Histórico */}
                        <button
                          onClick={() => openHistorico(v)}
                          className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Histórico de bloqueios"
                        >
                          <History size={14} />
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        {/* Remover */}
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ── Modal: Adicionar / Editar ──────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar veículo' : 'Adicionar veículo'}>
        {/* Indicador de etapas */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                  i < step   ? 'bg-blue-600 text-white' :
                  i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                               'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-1 transition-colors ${i < step ? 'bg-blue-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <Input label="Placa" placeholder="ABC-1234 ou ABC1D23"
              value={form.placa} onChange={e => update('placa', formatPlaca(e.target.value))}
              disabled={!!editingId} helperText="Formato antigo (AAA-0000) ou Mercosul (AAA0A00)" />
            <Input label="Modelo" placeholder="Ex: Honda Fit 1.5 EX"
              value={form.modelo} onChange={e => update('modelo', e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Selecione o combustível</label>
            <div className="grid grid-cols-2 gap-2">
              {COMBUSTIVEIS.map(c => (
                <label key={c} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  form.combustivel === c ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="combustivel" value={c}
                    checked={form.combustivel === c} onChange={() => update('combustivel', c)} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    form.combustivel === c ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    {form.combustivel === c && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className={`text-sm font-medium ${form.combustivel === c ? 'text-blue-700' : 'text-gray-700'}`}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input label="Limite mensal (R$)" type="number" placeholder="Ex: 1200 (opcional)"
              value={form.limiteMensal} onChange={e => update('limiteMensal', e.target.value)}
              helperText="Deixe em branco para sem limite" />
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => update('exigirQuilometragem', !form.exigirQuilometragem)}>
              <div className="relative shrink-0">
                <div className={`w-9 h-5 rounded-full transition-colors ${form.exigirQuilometragem ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.exigirQuilometragem ? 'translate-x-4' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Exigir quilometragem</p>
                <p className="text-xs text-gray-400">Motorista deverá informar o odômetro ao abastecer</p>
              </div>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motorista padrão</label>
              <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                value={form.motoristaPadraoId} onChange={e => update('motoristaPadraoId', e.target.value)}>
                <option value="">Nenhum</option>
                {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            {saveError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{saveError}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-5 mt-auto">
          <Button variant="secondary" className="flex-1"
            onClick={() => step === 0 ? setModalOpen(false) : setStep(s => s - 1)}>
            {step === 0 ? 'Cancelar' : <><ChevronLeft size={14} /> Voltar</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Próximo <ChevronRight size={14} />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editingId ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          )}
        </div>
      </Modal>

      {/* ── Modal: Remover ─────────────────────────────────────────────────── */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Remover veículo" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 font-mono">{deleteTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{deleteTarget.modelo} · {deleteTarget.combustivel}</p>
            </div>
            <p className="text-sm text-gray-600">O veículo será removido da frota. Requisições e histórico serão preservados.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Removendo...</> : 'Remover'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Bloquear ────────────────────────────────────────────────── */}
      <Modal isOpen={bloqueioTarget !== null} onClose={() => setBloqueioTarget(null)} title="Bloquear veículo" size="sm">
        {bloqueioTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold font-mono text-gray-900">{bloqueioTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{bloqueioTarget.modelo}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de bloqueio</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'operacional', label: 'Operacional', icon: Lock, desc: 'Suspenso por decisão da empresa' },
                  { value: 'manutencao',  label: 'Manutenção',  icon: Wrench, desc: 'Veículo em serviço ou reparo' },
                ] as const).map(({ value, label, icon: Icon, desc }) => (
                  <label key={value} className={`flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    bloqueioTipo === value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="bloqueioTipo" value={value}
                      checked={bloqueioTipo === value} onChange={() => setBloqueioTipo(value)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={bloqueioTipo === value ? 'text-orange-500' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${bloqueioTipo === value ? 'text-orange-700' : 'text-gray-700'}`}>{label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Descreva o motivo do bloqueio..."
                value={bloqueioMotivo}
                onChange={e => setBloqueioMotivo(e.target.value)}
              />
            </div>

            {bloqueioError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{bloqueioError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setBloqueioTarget(null)}>Cancelar</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleBloquear} disabled={bloqueioSaving || !bloqueioMotivo.trim()}>
                {bloqueioSaving ? <><Loader2 size={14} className="animate-spin" /> Bloqueando...</> : 'Confirmar bloqueio'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Desbloquear ─────────────────────────────────────────────── */}
      <Modal isOpen={desbloqueioTarget !== null} onClose={() => setDesbloqueioTarget(null)} title="Desbloquear veículo" size="sm">
        {desbloqueioTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold font-mono text-gray-900">{desbloqueioTarget.placa}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desbloqueioTarget.modelo}</p>
              {desbloqueioTarget.bloqueioTipo === 'manutencao' && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  <Wrench size={10} /> Em manutenção
                </span>
              )}
              {desbloqueioTarget.bloqueioTipo === 'operacional' && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  <Lock size={10} /> Bloqueio operacional
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo do desbloqueio <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Ex: Manutenção concluída, veículo liberado para uso..."
                value={desbloqueioMotivo}
                onChange={e => setDesbloqueioMotivo(e.target.value)}
              />
            </div>

            {desbloqueioError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{desbloqueioError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDesbloqueioTarget(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleDesbloquear} disabled={desbloqueioSaving || !desbloqueioMotivo.trim()}>
                {desbloqueioSaving ? <><Loader2 size={14} className="animate-spin" /> Desbloqueando...</> : 'Confirmar desbloqueio'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Histórico de bloqueios ──────────────────────────────────── */}
      <Modal isOpen={historicoTarget !== null} onClose={() => setHistoricoTarget(null)}
        title={historicoTarget ? `Histórico — ${historicoTarget.placa}` : 'Histórico'}>
        <div className="min-h-[200px]">
          {loadingHistorico && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          )}

          {!loadingHistorico && historico.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History size={28} className="mb-2 text-gray-200" />
              <p className="text-sm">Nenhum registro de bloqueio encontrado.</p>
            </div>
          )}

          {!loadingHistorico && historico.length > 0 && (
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
              {historico.map((log, i) => (
                <li key={log.id} className="ml-5">
                  {/* Dot */}
                  <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-2 ring-white ${
                    log.acao === 'bloqueio'
                      ? (log.tipo === 'manutencao' ? 'bg-amber-400' : 'bg-red-400')
                      : 'bg-green-400'
                  }`} style={{ top: `${i * 88 + 4}px` }} />

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      {log.acao === 'bloqueio' ? (
                        <>
                          {log.tipo === 'manutencao'
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"><Wrench size={10} /> Em manutenção</span>
                            : <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full"><Lock size={10} /> Bloqueado</span>
                          }
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          <LockOpen size={10} /> Desbloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.motivo}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Por <span className="font-medium text-gray-500">{log.perfil_nome}</span> · {formatDate(log.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="pt-4 mt-auto">
          <Button variant="secondary" className="w-full" onClick={() => setHistoricoTarget(null)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}
