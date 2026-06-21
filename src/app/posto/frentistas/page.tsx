'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Pencil, Power, Search, Store, X, CheckCircle, ChevronRight, ChevronLeft, Loader2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type StatusFrentista = 'ativo' | 'inativo'

interface Posto { id: string; nome: string }

interface Frentista {
  id: string
  posto_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  turno: string | null
  status: StatusFrentista
  created_at: string
  updated_at: string
}

function emptyForm() {
  return { postoId: '', nome: '', cpf: '', telefone: '', email: '', turno: 'Manhã', senha: '' }
}

function maskCpf(cpf: string | null): string {
  if (!cpf) return '—'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '—' }
}

export default function FrentistasPage() {
  const [frentistas, setFrentistas] = useState<Frentista[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroPosto, setFiltroPosto] = useState('')
  const [form, setForm] = useState(emptyForm())

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  // ── Fetch dados ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/posto/frentistas')
      if (!res.ok) throw new Error('Erro ao carregar frentistas.')
      const data = await res.json()
      setFrentistas(data.frentistas ?? [])
      setPostos(data.postos ?? [])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Abrir modais ──────────────────────────────────────────────────────
  const abrirAdicionar = () => {
    setEditingId(null)
    setForm({ ...emptyForm(), postoId: postos[0]?.id ?? '' })
    setModalStep(1)
    setErro(null)
    setModalOpen(true)
  }

  const abrirEditar = (f: Frentista) => {
    setEditingId(f.id)
    setForm({
      postoId: f.posto_id,
      nome: f.nome,
      cpf: f.cpf ?? '',
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      turno: f.turno ?? 'Manhã',
      senha: '',
    })
    setModalStep(1)
    setErro(null)
    setModalOpen(true)
  }

  // ── Salvar ────────────────────────────────────────────────────────────
  const handleSalvar = async () => {
    const postoId = form.postoId || postos[0]?.id || ''
    if (!postoId) { setErro('Nenhum posto disponível.'); return }

    setSaving(true)
    setErro(null)
    try {
      if (editingId) {
        // Edição
        const res = await fetch('/api/posto/frentistas', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            postoId,
            nome: form.nome,
            cpf: form.cpf,
            telefone: form.telefone,
            email: form.email,
            turno: form.turno,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Erro ao atualizar.')
        }
        const { frentista } = await res.json()
        setFrentistas(prev => prev.map(f => f.id === editingId ? frentista : f))
      } else {
        // Criação
        const res = await fetch('/api/posto/frentistas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postoId,
            nome: form.nome,
            cpf: form.cpf,
            telefone: form.telefone,
            email: form.email,
            turno: form.turno,
            senha: form.senha,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Erro ao cadastrar.')
        }
        const { frentista } = await res.json()
        setFrentistas(prev => [...prev, frentista])
      }
      setModalOpen(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────
  const toggleStatus = async (f: Frentista) => {
    const novoStatus = f.status === 'ativo' ? 'inativo' : 'ativo'
    // Otimista
    setFrentistas(prev => prev.map(x => x.id === f.id ? { ...x, status: novoStatus } : x))

    const res = await fetch('/api/posto/frentistas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, status: novoStatus }),
    })
    if (!res.ok) {
      // Reverte
      setFrentistas(prev => prev.map(x => x.id === f.id ? { ...x, status: f.status } : x))
    }
  }

  // ── Filtro ────────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return frentistas.filter((f) => {
      const matchBusca = !q || f.nome.toLowerCase().includes(q) || (f.email ?? '').toLowerCase().includes(q)
      const matchPosto = !filtroPosto || f.posto_id === filtroPosto
      return matchBusca && matchPosto
    })
  }, [frentistas, busca, filtroPosto])

  const postoNome = (postoId: string) => postos.find(p => p.id === postoId)?.nome ?? '—'
  const temFiltro = busca !== '' || filtroPosto !== ''
  const isEditing = editingId !== null

  // ── Validação do passo 1 ──────────────────────────────────────────────
  const step1Valido = form.nome.trim() !== '' && form.email.trim() !== '' && (isEditing || form.senha.trim() !== '')

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 size={20} className="animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Carregando frentistas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Frentistas</h1>
          <p className="text-gray-500 text-sm">{frentistas.length} frentista{frentistas.length !== 1 ? 's' : ''} cadastrado{frentistas.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={abrirAdicionar}>
          <Plus size={14} /> Adicionar frentista
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          />
        </div>
        <div className="relative">
          <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filtroPosto}
            onChange={(e) => setFiltroPosto(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none cursor-pointer"
          >
            <option value="">Todos os postos</option>
            {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        {temFiltro && (
          <button
            onClick={() => { setBusca(''); setFiltroPosto('') }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <X size={12} /> Limpar
          </button>
        )}
        <p className="text-xs text-gray-400 ml-auto">
          {filtrados.length} de {frentistas.length} frentista{frentistas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabela */}
      <Card padding="none">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Search size={24} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {frentistas.length === 0 ? 'Nenhum frentista cadastrado' : 'Nenhum frentista encontrado'}
            </p>
            {temFiltro && (
              <button onClick={() => { setBusca(''); setFiltroPosto('') }} className="text-xs text-blue-500 hover:underline mt-1">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="px-5 py-3 text-left">Frentista</th>
                <th className="px-5 py-3 text-left">CPF</th>
                <th className="px-5 py-3 text-left">Posto</th>
                <th className="px-5 py-3 text-left">Turno</th>
                <th className="px-5 py-3 text-left">Cadastro</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        f.status === 'inativo' ? 'bg-gray-100' : 'bg-blue-100'
                      )}>
                        <span className={cn(
                          'text-xs font-bold',
                          f.status === 'inativo' ? 'text-gray-400' : 'text-blue-700'
                        )}>
                          {f.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div>
                        <span className={cn(
                          'text-sm font-semibold block',
                          f.status === 'inativo' ? 'text-gray-400' : 'text-gray-900'
                        )}>{f.nome}</span>
                        {f.email && <span className="text-xs text-gray-400">{f.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gray-500">{maskCpf(f.cpf)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Store size={10} /> {postoNome(f.posto_id)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{f.turno ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(f.created_at)}</td>
                  <td className="px-5 py-3.5"><Badge variant={f.status} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => abrirEditar(f)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => toggleStatus(f)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                          f.status === 'ativo'
                            ? 'text-red-400 hover:text-red-600 border-red-100 hover:border-red-200 bg-red-50'
                            : 'text-emerald-600 hover:text-emerald-700 border-emerald-100 hover:border-emerald-300 bg-emerald-50'
                        )}
                        title={f.status === 'ativo' ? 'Inativar frentista' : 'Ativar frentista'}
                      >
                        <Power size={12} />
                        {f.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal adicionar / editar — 2 passos */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Editar frentista' : 'Adicionar frentista'}
      >
        {/* Indicador de passo */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
            modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-600'
          )}>
            {modalStep > 1 ? <CheckCircle size={14} /> : '1'}
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
            modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
          )}>
            2
          </div>
        </div>

        {modalStep === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Dados pessoais</p>

            <Input
              label="Nome completo"
              placeholder="Roberto Silva"
              value={form.nome}
              onChange={(e) => update('nome', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => update('cpf', e.target.value)}
              />
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) => update('telefone', e.target.value)}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="roberto@posto.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />

            {!isEditing && (
              <Input
                label="Senha de acesso"
                type="password"
                placeholder="••••••••"
                value={form.senha}
                onChange={(e) => update('senha', e.target.value)}
              />
            )}

            {!isEditing && (
              <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <Info size={12} className="mt-0.5 shrink-0 text-blue-400" />
                O frentista usará o email e senha para acessar o sistema.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => {
                if (!form.postoId && postos.length > 0) {
                  setForm(f => ({ ...f, postoId: postos[0].id }))
                }
                setModalStep(2)
              }} disabled={!step1Valido}>
                Próximo <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {modalStep === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Vínculo ao posto</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto</label>
              <div className="relative">
                <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 appearance-none"
                  value={form.postoId}
                  onChange={(e) => update('postoId', e.target.value)}
                >
                  {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Turno</label>
              <select
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                value={form.turno}
                onChange={(e) => update('turno', e.target.value)}
              >
                <option>Manhã</option>
                <option>Tarde</option>
                <option>Noite</option>
              </select>
            </div>

            <div className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <Store size={12} className="text-amber-500 shrink-0" />
              {isEditing
                ? <>Frentista vinculado ao posto <strong className="text-amber-700">{postos.find(p => p.id === form.postoId)?.nome}</strong>.</>
                : <>Este frentista poderá validar abastecimentos em <strong className="text-amber-700">{postos.find(p => p.id === form.postoId)?.nome}</strong>.</>
              }
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setModalStep(1)}>
                <ChevronLeft size={14} /> Voltar
              </Button>
              <Button className="flex-1" onClick={handleSalvar} disabled={saving || !form.nome}>
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                ) : isEditing ? (
                  <><CheckCircle size={14} /> Salvar alterações</>
                ) : (
                  'Adicionar'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
