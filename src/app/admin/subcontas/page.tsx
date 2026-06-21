'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, AlertCircle, XCircle, Pencil, Loader2 } from 'lucide-react'

type AsaasStatus = 'ACTIVE' | 'PENDING' | 'DISABLED'

interface Subconta {
  id: string
  name: string
  email: string
  cpfCnpj: string
  status: AsaasStatus | null
  walletId: string | null
  city: string | null
  state: string | null
  loginEmail: string | null
  accountNumber: string | null
}

const statusBadge: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ACTIVE:   { label: 'ACTIVE',   cls: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  PENDING:  { label: 'PENDING',  cls: 'bg-amber-50 text-amber-700', icon: AlertCircle },
  DISABLED: { label: 'DISABLED', cls: 'bg-red-50 text-red-700',     icon: XCircle },
}

export default function SubcontasAdminPage() {
  const [subcontas, setSubcontas] = useState<Subconta[]>([])
  const [loading,   setLoading]   = useState(true)
  const [erro,      setErro]      = useState<string | null>(null)
  const [lastSync,  setLastSync]  = useState<string | null>(null)

  // Modal de edição de e-mail
  const [editando,     setEditando]     = useState<Subconta | null>(null)
  const [novoEmail,    setNovoEmail]    = useState('')
  const [salvando,     setSalvando]     = useState(false)
  const [erroEdit,     setErroEdit]     = useState<string | null>(null)

  const fetchSubcontas = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/asaas/subcontas')
      const d   = await res.json()
      if (!res.ok) { setErro(d.error ?? 'Erro ao buscar subcontas.'); return }
      setSubcontas(d.subcontas ?? [])
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (e) {
      setErro(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubcontas() }, [fetchSubcontas])

  function abrirEdicao(s: Subconta) {
    setEditando(s)
    setNovoEmail(s.email)
    setErroEdit(null)
  }

  async function salvarEmail() {
    if (!editando) return
    setSalvando(true)
    setErroEdit(null)
    try {
      const res = await fetch(`/api/admin/asaas/subcontas/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: novoEmail.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { setErroEdit(d.error ?? 'Erro ao salvar.'); return }
      setSubcontas(prev => prev.map(s => s.id === editando.id ? { ...s, email: novoEmail.trim() } : s))
      setEditando(null)
    } catch (e) {
      setErroEdit(String(e))
    } finally {
      setSalvando(false)
    }
  }

  const ativas    = subcontas.filter(s => s.status === 'ACTIVE').length
  const pendentes = subcontas.filter(s => s.status === 'PENDING').length
  const disabled  = subcontas.filter(s => s.status === 'DISABLED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcontas Asaas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Subcontas cadastradas diretamente no Asaas</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && <p className="text-xs text-gray-400">Atualizado: {lastSync}</p>}
          <Button variant="secondary" size="md" onClick={fetchSubcontas} isLoading={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{loading ? '—' : ativas}</p>
              <p className="text-sm text-gray-500">Subcontas ativas</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{loading ? '—' : pendentes}</p>
              <p className="text-sm text-gray-500">Aguardando aprovação</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{loading ? '—' : disabled}</p>
              <p className="text-sm text-gray-500">Desabilitadas</p>
            </div>
          </div>
        </Card>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>
      )}

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando subcontas...</span>
          </div>
        ) : subcontas.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Nenhuma subconta encontrada no Asaas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ / CPF</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Cidade / UF</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Wallet ID</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subcontas.map(s => {
                  const badge = s.status ? statusBadge[s.status] : null
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{s.email}</td>
                      <td className="px-5 py-3 text-xs text-gray-600 font-mono">{s.cpfCnpj || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {s.city ? `${s.city}${s.state ? ` / ${s.state}` : ''}` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {s.walletId
                          ? <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{s.walletId}</span>
                          : <span className="text-xs text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {badge ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                            <badge.icon size={12} />
                            {badge.label}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => abrirEdicao(s)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <Pencil size={13} />
                          Editar e-mail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de edição de e-mail */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Editar e-mail da subconta</h2>
              <p className="text-sm text-gray-500 mt-0.5">{editando.name}</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail atual</label>
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {editando.email}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Novo e-mail</label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={e => setNovoEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvarEmail()}
                  placeholder="novo@email.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {erroEdit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {erroEdit}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => setEditando(null)}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
                <Button
                  size="md"
                  className="flex-1"
                  onClick={salvarEmail}
                  isLoading={salvando}
                  disabled={!novoEmail.trim() || novoEmail.trim() === editando.email}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
