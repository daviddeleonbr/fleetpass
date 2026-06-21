'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Star, Fuel, CheckSquare, Square, Camera, X, ImageIcon, ThumbsUp, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

type Horario = {
  dia: string
  horario: string
}

type Avaliacao = {
  empresa: string
  nota: number
  data: string
  texto: string
  util: number
}

type DistribuicaoNota = {
  nota: number
  count: number
}

type PostoDetail = {
  id: string
  nome: string
  endereco: string
  bandeira: string
  avaliacao: number
  totalAvaliacoes: number
  sobre: string
  combustiveis: string[]
  horarios: Horario[]
  parceiro: boolean
  solicitacaoPendente: boolean
}

type PostoDetailResponse = {
  posto: PostoDetail
  avaliacoes: Avaliacao[]
  distribuicaoNotas: DistribuicaoNota[]
}

function StarRow({ filled }: { nota: number; filled: boolean }) {
  return (
    <Star
      size={14}
      className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
    />
  )
}

const HORARIOS_PLACEHOLDER: Horario[] = [
  { dia: 'Segunda a Sexta', horario: '06:00 – 22:00' },
  { dia: 'Sábado', horario: '07:00 – 20:00' },
  { dia: 'Domingo e Feriados', horario: '08:00 – 18:00' },
]

export default function PostoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [posto, setPosto] = useState<PostoDetail | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [distribuicaoNotas, setDistribuicaoNotas] = useState<DistribuicaoNota[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFuels, setSelectedFuels] = useState<string[]>([])
  const [mensagem, setMensagem] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosto() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/empresa/marketplace/${id}`)
        if (!res.ok) throw new Error('Erro ao carregar dados do posto.')
        const data: PostoDetailResponse = await res.json()
        setPosto(data.posto)
        setAvaliacoes(data.avaliacoes ?? [])
        setDistribuicaoNotas(data.distribuicaoNotas ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      } finally {
        setLoading(false)
      }
    }
    fetchPosto()
  }, [id])

  const toggleFuel = (f: string) =>
    setSelectedFuels((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])

  const handleSend = async () => {
    if (!posto) return
    try {
      setSending(true)
      setSendError(null)
      const res = await fetch('/api/empresa/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postoId: posto.id, combustiveis: selectedFuels, mensagem }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Erro ao enviar solicitação.')
      }
      setSent(true)
      setTimeout(() => { setModalOpen(false); setSent(false); setSendError(null) }, 1500)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro ao enviar solicitação.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Link href="/empresa/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} /> Voltar ao marketplace
        </Link>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Carregando dados do posto...</span>
        </div>
      </div>
    )
  }

  if (error || !posto) {
    return (
      <div className="max-w-2xl">
        <Link href="/empresa/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} /> Voltar ao marketplace
        </Link>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-sm">{error ?? 'Posto não encontrado.'}</p>
        </div>
      </div>
    )
  }

  const horarios = posto.horarios?.length ? posto.horarios : HORARIOS_PLACEHOLDER

  return (
    <div className="max-w-2xl">
      <Link href="/empresa/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Voltar ao marketplace
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{posto.bandeira}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{posto.nome}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                <MapPin size={14} />
                {posto.endereco}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-amber-700">{posto.avaliacao}</span>
              <span className="text-xs text-amber-500">({posto.totalAvaliacoes})</span>
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Fotos</h2>
          </div>
          <div className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-300">
            <Camera size={24} />
            <span className="text-sm">Nenhuma foto disponível</span>
          </div>
        </div>

        {/* Combustíveis */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Fuel size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Combustíveis disponíveis</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {posto.combustiveis.map((c) => (
              <span key={c} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">{c}</span>
            ))}
          </div>
        </div>

        {/* Horários */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Horários de funcionamento</h2>
          </div>
          <div className="space-y-2">
            {horarios.map((h) => (
              <div key={h.dia} className="flex justify-between text-sm">
                <span className="text-gray-600">{h.dia}</span>
                <span className="font-medium text-gray-900">{h.horario}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sobre */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-2">Sobre o posto</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{posto.sobre}</p>
        </div>

        {/* Avaliações */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Avaliações de clientes</h2>
            <span className="text-xs text-gray-400 ml-auto">{posto.totalAvaliacoes} avaliações</span>
          </div>

          {/* Resumo de notas */}
          <div className="flex items-center gap-6 mb-5 p-4 bg-gray-50 rounded-xl">
            <div className="text-center shrink-0">
              <p className="text-4xl font-bold text-gray-900">{posto.avaliacao}</p>
              <div className="flex gap-0.5 justify-center mt-1">
                {[1,2,3,4,5].map((n) => (
                  <StarRow key={n} nota={n} filled={n <= Math.round(posto.avaliacao)} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">de 5</p>
            </div>
            <div className="flex-1 space-y-1">
              {distribuicaoNotas.map(({ nota, count }) => (
                <div key={nota} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-2">{nota}</span>
                  <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: posto.totalAvaliacoes > 0 ? `${(count / posto.totalAvaliacoes) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de avaliações */}
          {avaliacoes.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma avaliação ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((a, i) => (
                <div key={i} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.empresa}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map((n) => (
                          <StarRow key={n} nota={n} filled={n <= a.nota} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{a.data}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{a.texto}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <ThumbsUp size={11} />
                    <span>{a.util} acharam útil</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-6">
          {posto.parceiro ? (
            <Button className="w-full" size="lg" disabled>
              Parceiro ativo
            </Button>
          ) : posto.solicitacaoPendente ? (
            <Button className="w-full" size="lg" disabled>
              Solicitação enviada
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setModalOpen(true)}>
              Solicitar Parceria
            </Button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {fotoPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoPreview} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white">
            <X size={24} />
          </button>
        </div>
      )}

      {/* Modal parceria */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSendError(null) }} title="Solicitar parceria" size="md">
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckSquare size={22} className="text-emerald-500" />
            </div>
            <p className="font-medium text-gray-900">Solicitação enviada!</p>
            <p className="text-sm text-gray-400 mt-1">O posto {posto.nome} irá analisar seu pedido.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Envie uma solicitação de parceria para <strong>{posto.nome}</strong>.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Combustíveis de interesse</label>
              <div className="space-y-2">
                {posto.combustiveis.map((f) => (
                  <label key={f} className="flex items-center gap-2.5 cursor-pointer">
                    <button type="button" onClick={() => toggleFuel(f)} className="text-gray-400">
                      {selectedFuels.includes(f) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                    <span className="text-sm text-gray-700">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensagem (opcional)</label>
              <textarea
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
                rows={3}
                placeholder="Descreva brevemente sua necessidade..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </div>

            {sendError && (
              <p className="text-sm text-red-600">{sendError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setModalOpen(false); setSendError(null) }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending}>
                {sending ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : 'Enviar solicitação'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
