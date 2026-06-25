'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, AlertCircle, Check, X, Store, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Convite {
  id: string; posto: string; cidade: string; bandeira: string | null
  combustiveis: string[]; mensagem: string | null; expira_em: string | null; created_at: string
}

const dataBR = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

export default function ConvitesEmpresaPage() {
  const router = useRouter()
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [acao, setAcao] = useState<{ id: string; tipo: 'aceitar' | 'recusar' } | null>(null)
  const [acaoErro, setAcaoErro] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    fetch('/api/empresa/convites')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setConvites(d.convites ?? []))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function responder(id: string, tipo: 'aceitar' | 'recusar') {
    setAcao({ id, tipo }); setAcaoErro('')
    try {
      const res = await fetch(`/api/empresa/convites/${id}/${tipo}`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro.')
      if (tipo === 'aceitar') { router.push('/empresa/parcerias'); return }
      carregar()
    } catch (e) {
      setAcaoErro(e instanceof Error ? e.message : 'Erro ao responder convite.')
    } finally {
      setAcao(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
        <p className="text-gray-500 text-sm mt-1">Postos que convidaram sua transportadora para uma parceria.</p>
      </div>

      {acaoErro && (
        <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={15} /> {acaoErro}</div>
      )}

      {erro ? (
        <div className="flex items-center gap-2 py-10 justify-center text-sm text-red-500">
          <AlertCircle size={16} /> {erro}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-gray-400">
          <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando convites…</span>
        </div>
      ) : convites.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <Mail size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">Nenhum convite pendente.</p>
          <p className="text-xs text-gray-400 mt-1">Quando um posto convidar sua empresa, ele aparece aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {convites.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-petrol-50 rounded-xl flex items-center justify-center shrink-0">
                  <Store size={18} className="text-petrol-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.posto}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} /> {c.cidade}</p>
                </div>
              </div>

              {c.mensagem && (
                <blockquote className="border-l-3 border-petrol-200 bg-petrol-50 text-petrol-800 text-xs px-3 py-2 rounded mb-3">
                  {c.mensagem}
                </blockquote>
              )}

              {c.combustiveis?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.combustiveis.map((f) => (
                    <span key={f} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-4">
                <Clock size={11} /> Recebido em {dataBR(c.created_at)}
                {c.expira_em ? ` · expira ${dataBR(c.expira_em)}` : ''}
              </p>

              <div className="flex gap-2">
                <Button className="flex-1" isLoading={acao?.id === c.id && acao.tipo === 'aceitar'} disabled={!!acao} onClick={() => responder(c.id, 'aceitar')}>
                  <Check size={14} /> Aceitar
                </Button>
                <Button variant="secondary" className="flex-1 text-red-500 border-red-100 hover:border-red-200" isLoading={acao?.id === c.id && acao.tipo === 'recusar'} disabled={!!acao} onClick={() => responder(c.id, 'recusar')}>
                  <X size={14} /> Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
