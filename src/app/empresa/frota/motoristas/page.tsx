'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Lock, LockOpen, History, UserX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Motorista {
  id: string
  nome: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  telefone: string | null
  email: string | null
  cnh_numero: string | null
  cnh_categoria: string | null
  cnh_validade: string | null
  vinculo: string | null
  matricula: string | null
  observacao: string | null
  status: 'ativo' | 'pendente' | 'inativo'
  bloqueado: boolean
}

interface MotoLog {
  id: string
  acao: 'cadastro' | 'edicao' | 'bloqueio' | 'desbloqueio' | 'inativacao' | 'reativacao'
  motivo: string | null
  perfil_nome: string
  detalhes: { campos?: string[] } | null
  created_at: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const POR_PAGINA    = 8
const CATEGORIAS_CNH = ['A','B','C','D','E','AB','AC','AD','AE']
const VINCULOS      = ['CLT','PJ','Autônomo','Cooperado','Temporário']
const STEPS         = ['Dados pessoais','Habilitação','Contato','Vínculo','Observações']

const FORM_VAZIO = {
  nome:'', cpf:'', rg:'', data_nascimento:'',
  telefone:'', email:'',
  cnh_numero:'', cnh_categoria:'', cnh_validade:'',
  vinculo:'', matricula:'', observacao:'',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome: string) {
  return nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
  })
}

function cnhExpirada(validade: string | null) {
  if (!validade) return false
  return new Date(validade) < new Date()
}

function StatusBadge({ m }: { m: Motorista }) {
  if (m.status === 'inativo')   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Inativo</span>
  if (m.bloqueado)              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200"><Lock size={9}/> Bloqueado</span>
  if (m.status === 'pendente')  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Pendente</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Ativo</span>
}

const LOG_CONFIG = {
  cadastro:    { label: 'Cadastrado',    dot: 'bg-blue-400'   },
  edicao:      { label: 'Dados editados',dot: 'bg-gray-400'   },
  bloqueio:    { label: 'Bloqueado',     dot: 'bg-red-400'    },
  desbloqueio: { label: 'Desbloqueado', dot: 'bg-emerald-400' },
  inativacao:  { label: 'Inativado',     dot: 'bg-gray-500'   },
  reativacao:  { label: 'Reativado',     dot: 'bg-emerald-500'},
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MotoristasPage() {
  const [motoristas,  setMotoristas]  = useState<Motorista[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [pagina,      setPagina]      = useState(1)

  // Cadastro / edição
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [step,        setStep]        = useState(1)
  const [form,        setForm]        = useState(FORM_VAZIO)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  // Inativação
  const [inativarTarget,  setInativarTarget]  = useState<Motorista | null>(null)
  const [inativarMotivo,  setInativarMotivo]  = useState('')
  const [inativando,      setInativando]      = useState(false)

  // Bloqueio
  const [bloqueioTarget,  setBloqueioTarget]  = useState<Motorista | null>(null)
  const [bloqueioMotivo,  setBloqueioMotivo]  = useState('')
  const [bloqueioSaving,  setBloqueioSaving]  = useState(false)
  const [bloqueioError,   setBloqueioError]   = useState<string | null>(null)

  // Desbloqueio
  const [desbTarget,  setDesbTarget]  = useState<Motorista | null>(null)
  const [desbMotivo,  setDesbMotivo]  = useState('')
  const [desbSaving,  setDesbSaving]  = useState(false)
  const [desbError,   setDesbError]   = useState<string | null>(null)

  // Logs
  const [logsTarget,      setLogsTarget]      = useState<Motorista | null>(null)
  const [logs,            setLogs]            = useState<MotoLog[]>([])
  const [loadingLogs,     setLoadingLogs]     = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchMotoristas() {
    try {
      setLoading(true); setError(null)
      const res = await fetch('/api/empresa/frota/motoristas?todos=true')
      if (!res.ok) throw new Error('Erro ao carregar motoristas.')
      const { motoristas: m } = await res.json()
      setMotoristas(m ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchMotoristas() }, [])

  // ── Cadastro / Edição ──────────────────────────────────────────────────────

  function openAdd() {
    setForm(FORM_VAZIO); setEditingId(null); setSaveError(null); setStep(1); setModalOpen(true)
  }

  function openEdit(m: Motorista) {
    setForm({
      nome:            m.nome,
      cpf:             m.cpf ?? '',
      rg:              m.rg ?? '',
      data_nascimento: m.data_nascimento ?? '',
      telefone:        m.telefone ?? '',
      email:           m.email ?? '',
      cnh_numero:      m.cnh_numero ?? '',
      cnh_categoria:   m.cnh_categoria ?? '',
      cnh_validade:    m.cnh_validade ?? '',
      vinculo:         m.vinculo ?? '',
      matricula:       m.matricula ?? '',
      observacao:      m.observacao ?? '',
    })
    setEditingId(m.id); setSaveError(null); setStep(1); setModalOpen(true)
  }

  const upd = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  function canAdvance() {
    if (step === 1) return form.nome.trim().length > 0
    return true
  }

  async function handleSave() {
    setSaving(true); setSaveError(null)
    try {
      const url    = editingId ? `/api/empresa/frota/motoristas/${editingId}` : '/api/empresa/frota/motoristas'
      const method = editingId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar.')
      setModalOpen(false)
      await fetchMotoristas()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  // ── Inativação ─────────────────────────────────────────────────────────────

  async function handleInativar() {
    if (!inativarTarget) return
    setInativando(true)
    try {
      const res = await fetch(`/api/empresa/frota/motoristas/${inativarTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: inativarMotivo }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setInativarTarget(null)
      setMotoristas(prev => prev.map(m => m.id === inativarTarget.id ? { ...m, status: 'inativo' } : m))
    } catch (err) { console.error(err) } finally { setInativando(false) }
  }

  // ── Bloqueio ───────────────────────────────────────────────────────────────

  async function handleBloquear() {
    if (!bloqueioTarget) return
    setBloqueioSaving(true); setBloqueioError(null)
    try {
      const res = await fetch(`/api/empresa/frota/motoristas/${bloqueioTarget.id}/bloquear`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: bloqueioMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBloqueioTarget(null)
      setMotoristas(prev => prev.map(m => m.id === bloqueioTarget.id ? { ...m, bloqueado: true } : m))
    } catch (err) { setBloqueioError(err instanceof Error ? err.message : 'Erro.') }
    finally { setBloqueioSaving(false) }
  }

  // ── Desbloqueio ────────────────────────────────────────────────────────────

  async function handleDesbloquear() {
    if (!desbTarget) return
    setDesbSaving(true); setDesbError(null)
    try {
      const res = await fetch(`/api/empresa/frota/motoristas/${desbTarget.id}/desbloquear`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: desbMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDesbTarget(null)
      setMotoristas(prev => prev.map(m => m.id === desbTarget.id ? { ...m, bloqueado: false } : m))
    } catch (err) { setDesbError(err instanceof Error ? err.message : 'Erro.') }
    finally { setDesbSaving(false) }
  }

  // ── Logs ───────────────────────────────────────────────────────────────────

  async function openLogs(m: Motorista) {
    setLogsTarget(m); setLogs([]); setLoadingLogs(true)
    try {
      const res  = await fetch(`/api/empresa/frota/motoristas/${m.id}/logs`)
      const data = await res.json()
      setLogs(data.logs ?? [])
    } catch { /* silencioso */ } finally { setLoadingLogs(false) }
  }

  // ── Filtro / Paginação ─────────────────────────────────────────────────────

  const filtered = motoristas.filter(m => {
    const q = search.toLowerCase()
    return !q || m.nome.toLowerCase().includes(q) ||
      (m.cpf ?? '').includes(q) || (m.matricula ?? '').toLowerCase().includes(q)
  })

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const paginados    = filtered.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  const selectCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motoristas</h1>
          <p className="text-gray-500 text-sm">
            {loading ? 'Carregando...' : `${motoristas.filter(m => m.status !== 'inativo').length} motorista${motoristas.length !== 1 ? 's' : ''} ativos`}
          </p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={14} /> Adicionar motorista</Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          placeholder="Buscar por nome, CPF ou matrícula..."
          value={search} onChange={e => { setSearch(e.target.value); setPagina(1) }}
        />
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Carregando motoristas...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />{error}
          <button onClick={fetchMotoristas} className="ml-auto underline text-xs">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && (
        <Card padding="none">
          {paginados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
              <Search size={24} className="text-gray-200" />
              <p className="text-sm font-medium">{motoristas.length === 0 ? 'Nenhum motorista cadastrado.' : 'Nenhum resultado encontrado.'}</p>
              {motoristas.length === 0 && <button onClick={openAdd} className="text-xs text-blue-500 hover:underline mt-1">Adicionar primeiro motorista</button>}
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                    <th className="px-5 py-3 text-left">Motorista</th>
                    <th className="px-5 py-3 text-left">CPF</th>
                    <th className="px-5 py-3 text-left">CNH</th>
                    <th className="px-5 py-3 text-left">Telefone</th>
                    <th className="px-5 py-3 text-left">Vínculo</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginados.map(m => (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${m.status === 'inativo' ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${m.bloqueado ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                            {initials(m.nome)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{m.nome}</p>
                            {m.matricula && <p className="text-xs text-gray-400">{m.matricula}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 font-mono">{m.cpf || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                            {m.cnh_categoria || '—'}
                          </span>
                          {m.cnh_validade && (
                            <span className={`text-xs ${cnhExpirada(m.cnh_validade) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {cnhExpirada(m.cnh_validade) ? '⚠ ' : ''}vence {fmtDate(m.cnh_validade)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{m.telefone || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{m.vinculo || '—'}</td>
                      <td className="px-5 py-3"><StatusBadge m={m} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Bloquear / Desbloquear */}
                          {m.status !== 'inativo' && (m.bloqueado ? (
                            <button onClick={() => { setDesbTarget(m); setDesbMotivo(''); setDesbError(null) }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Desbloquear">
                              <LockOpen size={14} />
                            </button>
                          ) : (
                            <button onClick={() => { setBloqueioTarget(m); setBloqueioMotivo(''); setBloqueioError(null) }}
                              className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Bloquear">
                              <Lock size={14} />
                            </button>
                          ))}
                          {/* Logs */}
                          <button onClick={() => openLogs(m)}
                            className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Histórico">
                            <History size={14} />
                          </button>
                          {/* Editar */}
                          {m.status !== 'inativo' && (
                            <button onClick={() => openEdit(m)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {/* Inativar */}
                          {m.status !== 'inativo' && (
                            <button onClick={() => { setInativarTarget(m); setInativarMotivo('') }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Inativar motorista">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronLeft size={15} className="text-gray-600" />
                    </button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPagina(n)}
                        className={`min-w-[28px] h-7 text-xs rounded-lg transition-colors ${n === paginaAtual ? 'bg-blue-600 text-white font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronRight size={15} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Modal: Cadastro / Edição ───────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar motorista' : 'Adicionar motorista'}>
        {/* Indicador de etapas */}
        <div className="flex items-center mb-5">
          {STEPS.map((_, i) => {
            const n = i + 1
            return (
              <div key={n} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-colors ${n === step ? 'border-blue-600 bg-blue-600 text-white' : n < step ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 bg-white text-gray-300'}`}>
                  {n < step ? '✓' : n}
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${n < step ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">
          Etapa {step} de {STEPS.length} — {STEPS[step - 1]}
        </p>

        <div className="min-h-[200px]">
          {step === 1 && (
            <div className="space-y-3">
              <Input label="Nome completo *" placeholder="Roberto Lima" value={form.nome} onChange={e => upd('nome', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => upd('cpf', e.target.value)} />
                <Input label="RG" placeholder="00.000.000-0" value={form.rg} onChange={e => upd('rg', e.target.value)} />
              </div>
              <Input label="Data de nascimento" type="date" value={form.data_nascimento} onChange={e => upd('data_nascimento', e.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Input label="Número da CNH" placeholder="00000000000" value={form.cnh_numero} onChange={e => upd('cnh_numero', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select className={selectCls} value={form.cnh_categoria} onChange={e => upd('cnh_categoria', e.target.value)}>
                    <option value="">Selecione</option>
                    {CATEGORIAS_CNH.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Input label="Validade" type="date" value={form.cnh_validade} onChange={e => upd('cnh_validade', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Input label="Telefone / WhatsApp" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => upd('telefone', e.target.value)} />
              <Input label="E-mail" type="email" placeholder="motorista@empresa.com.br" value={form.email} onChange={e => upd('email', e.target.value)} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de vínculo</label>
                  <select className={selectCls} value={form.vinculo} onChange={e => upd('vinculo', e.target.value)}>
                    <option value="">Selecione</option>
                    {VINCULOS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <Input label="Matrícula interna" placeholder="TL-0000" value={form.matricula} onChange={e => upd('matricula', e.target.value)} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <textarea
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                rows={5} placeholder="Restrições, autorizações especiais, observações relevantes..."
                value={form.observacao} onChange={e => upd('observacao', e.target.value)}
              />
            </div>
          )}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-3">
            <AlertCircle size={14} className="shrink-0" />{saveError}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
          <Button variant="secondary" className="flex-1"
            onClick={() => step > 1 ? setStep(s => s - 1) : setModalOpen(false)}>
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </Button>
          {step < STEPS.length ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>Próximo</Button>
          ) : (
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : editingId ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          )}
        </div>
      </Modal>

      {/* ── Modal: Inativar ────────────────────────────────────────────────── */}
      <Modal isOpen={inativarTarget !== null} onClose={() => setInativarTarget(null)} title="Inativar motorista" size="sm">
        {inativarTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <UserX size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{inativarTarget.nome}</p>
                {inativarTarget.matricula && <p className="text-xs text-gray-400">{inativarTarget.matricula}</p>}
              </div>
            </div>
            <p className="text-sm text-gray-600">O motorista será inativado. O histórico de abastecimentos será preservado.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo (opcional)</label>
              <textarea rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 resize-none"
                placeholder="Ex: Desligamento, término de contrato..." value={inativarMotivo} onChange={e => setInativarMotivo(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setInativarTarget(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" onClick={handleInativar} disabled={inativando}>
                {inativando ? <><Loader2 size={14} className="animate-spin" /> Inativando...</> : 'Inativar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Bloquear ────────────────────────────────────────────────── */}
      <Modal isOpen={bloqueioTarget !== null} onClose={() => setBloqueioTarget(null)} title="Bloquear motorista" size="sm">
        {bloqueioTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{bloqueioTarget.nome}</p>
              {bloqueioTarget.matricula && <p className="text-xs text-gray-400">{bloqueioTarget.matricula}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo <span className="text-red-400">*</span></label>
              <textarea rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Descreva o motivo do bloqueio..." value={bloqueioMotivo} onChange={e => setBloqueioMotivo(e.target.value)} />
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
      <Modal isOpen={desbTarget !== null} onClose={() => setDesbTarget(null)} title="Desbloquear motorista" size="sm">
        {desbTarget && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{desbTarget.nome}</p>
              {desbTarget.matricula && <p className="text-xs text-gray-400">{desbTarget.matricula}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo do desbloqueio <span className="text-red-400">*</span></label>
              <textarea rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Ex: Pendência regularizada, motorista liberado..." value={desbMotivo} onChange={e => setDesbMotivo(e.target.value)} />
            </div>
            {desbError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />{desbError}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDesbTarget(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleDesbloquear} disabled={desbSaving || !desbMotivo.trim()}>
                {desbSaving ? <><Loader2 size={14} className="animate-spin" /> Desbloqueando...</> : 'Confirmar desbloqueio'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Logs / Histórico ────────────────────────────────────────── */}
      <Modal isOpen={logsTarget !== null} onClose={() => setLogsTarget(null)}
        title={logsTarget ? `Histórico — ${logsTarget.nome}` : 'Histórico'}>
        <div className="min-h-[200px]">
          {loadingLogs && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          )}
          {!loadingLogs && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <History size={28} className="mb-2 text-gray-200" />
              <p className="text-sm">Nenhum registro encontrado.</p>
            </div>
          )}
          {!loadingLogs && logs.length > 0 && (
            <ol className="space-y-3">
              {logs.map((log, i) => {
                const cfg = LOG_CONFIG[log.acao] ?? { label: log.acao, dot: 'bg-gray-400' }
                return (
                  <li key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
                      {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-800">{cfg.label}</span>
                        {log.acao === 'edicao' && log.detalhes?.campos && (
                          <span className="text-xs text-gray-400">({log.detalhes.campos.join(', ')})</span>
                        )}
                      </div>
                      {log.motivo && <p className="text-sm text-gray-600 mb-0.5">{log.motivo}</p>}
                      <p className="text-xs text-gray-400">
                        Por <span className="font-medium text-gray-500">{log.perfil_nome}</span> · {fmtTs(log.created_at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <div className="pt-4 mt-auto border-t border-gray-100">
          <Button variant="secondary" className="w-full" onClick={() => setLogsTarget(null)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}
