'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2, AlertCircle, Users2, Building2, UserPlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PostoOpt { id: string; nome: string; combustiveis: string[] }
interface Resultado { id: string; nome: string; cnpj: string; cidade: string; status: string }

const RES_STATUS: Record<string, { label: string; cls: string }> = {
  convite:    { label: 'Convite pendente', cls: 'text-amber-600' },
  parceria:   { label: 'Já é parceiro',    cls: 'text-emerald-600' },
  negociacao: { label: 'Em negociação',    cls: 'text-blue-600' },
}

export default function ClientesPage() {
  const router = useRouter()
  const [postos, setPostos] = useState<PostoOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [postoId, setPostoId] = useState('')

  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [iniciandoId, setIniciandoId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/posto/postos')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => { setPostos(d.postos ?? []); setPostoId(d.postos?.[0]?.id ?? '') })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  // busca com debounce
  useEffect(() => {
    if (busca.trim().length < 2 || !postoId) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/posto/empresas/buscar?q=${encodeURIComponent(busca.trim())}&postoId=${postoId}`)
        .then((r) => r.json())
        .then((d) => setResultados(d.empresas ?? []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 350)
    return () => clearTimeout(t)
  }, [busca, postoId])

  // Convidar → cria a solicitação e vai direto ao formulário de proposta
  async function iniciar(empresaId: string) {
    setIniciandoId(empresaId); setToast('')
    try {
      const res = await fetch('/api/posto/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postoId, empresaId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao iniciar.')
      router.push(`/posto/parcerias/solicitacoes?proposta=${d.solicitacaoId}`)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erro ao iniciar.')
      setTimeout(() => setToast(''), 4500)
      setIniciandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">Encontre uma transportadora já cadastrada e envie uma proposta.</p>
      </div>

      <div className="flex items-center">
        <Link href="/posto/parcerias/ativos" className="ml-auto text-sm text-petrol-700 hover:underline flex items-center gap-1.5">
          <Users2 size={15} /> Parceiros ativos
        </Link>
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3.5 py-2.5">
          <AlertCircle size={15} /> {toast}
        </div>
      )}

      {erro ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-red-500"><AlertCircle size={16} /> {erro}</div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-gray-400"><Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando…</span></div>
      ) : postos.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
          Cadastre um posto em <Link href="/posto/meus-postos" className="text-petrol-700 underline">Meus Postos</Link> para convidar clientes.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-petrol-50 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-petrol-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Convidar transportadora</h2>
              <p className="text-xs text-gray-400">Ela precisa já ter conta no FleetPass. Busque pelo CNPJ ou nome.</p>
            </div>
          </div>

          {postos.length > 1 && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto</label>
              <select
                value={postoId} onChange={(e) => setPostoId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500"
              >
                {postos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}

          <div className="mt-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus
              placeholder="CNPJ ou nome da transportadora…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-petrol-500"
            />
            {buscando && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" />}
          </div>

          <div className="mt-3 space-y-2">
            {busca.trim().length < 2 ? (
              <p className="text-xs text-gray-400 px-1 py-4 text-center">Digite o CNPJ (completo) ou o nome para buscar.</p>
            ) : !buscando && resultados.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                Nenhuma transportadora encontrada.
                <p className="text-xs mt-1">Ela já se cadastrou no FleetPass? Peça que crie a conta primeiro.</p>
              </div>
            ) : (
              resultados.map((r) => {
                const st = RES_STATUS[r.status]
                return (
                  <div key={r.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Building2 size={15} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.nome}</p>
                      <p className="text-[11px] text-gray-400 truncate">{r.cnpj} · {r.cidade}</p>
                    </div>
                    {st ? (
                      <span className={`text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                    ) : (
                      <Button size="sm" isLoading={iniciandoId === r.id} disabled={!!iniciandoId} onClick={() => iniciar(r.id)}>
                        <Send size={13} /> Convidar
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
