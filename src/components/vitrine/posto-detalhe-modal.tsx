'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Building2, Fuel, CreditCard, CalendarClock, FileText, BarChart2, ClipboardCheck, Droplets, Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Estrelas, EstrelasInput } from './estrelas'
import { DISPONIBILIDADE, formatBRL, motivoIndisponivel, type PostoVitrine } from './types'

interface Props {
  posto: PostoVitrine | null
  onClose: () => void
  /** Chamado após salvar uma avaliação, para a lista recarregar as médias. */
  onAvaliado?: () => void
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{titulo}</h4>
      {children}
    </section>
  )
}

function Linha({ icon: Icon, label, valor }: { icon: React.ElementType; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-gray-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 break-words">{valor}</p>
      </div>
    </div>
  )
}

export function PostoDetalheModal({ posto, onClose, onAvaliado }: Props) {
  const [nota, setNota]             = useState(0)
  const [comentario, setComentario] = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState<string | null>(null)
  const [salvo, setSalvo]           = useState(false)

  // Recarrega o formulário sempre que outro posto é aberto.
  useEffect(() => {
    setNota(posto?.minhaAvaliacao?.nota ?? 0)
    setComentario(posto?.minhaAvaliacao?.comentario ?? '')
    setErro(null)
    setSalvo(false)
  }, [posto])

  if (!posto) return null

  const estado = DISPONIBILIDADE[posto.disponibilidade]
  const motivo = motivoIndisponivel(posto)

  async function enviarAvaliacao() {
    if (!posto || nota < 1) return
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch('/api/empresa/avaliacoes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ postoId: posto.postoId, nota, comentario }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Não foi possível salvar a avaliação.')
      setSalvo(true)
      onAvaliado?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a avaliação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal isOpen={!!posto} onClose={onClose} title={posto.nome} size="lg">
      <div className="space-y-6">
        {/* Resumo */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={estado.badge}>{estado.label}</Badge>
          <span className="text-xs text-gray-500">{posto.bandeira}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-500">Parceiro desde {posto.desde}</span>
          <span className="text-gray-200">·</span>
          <Estrelas nota={posto.nota} total={posto.totalAvaliacoes} />
        </div>

        {motivo && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            {motivo}
          </p>
        )}

        <Secao titulo="Informações do posto">
          <div className="grid sm:grid-cols-2 gap-4">
            <Linha icon={Building2} label="CNPJ" valor={posto.cnpj} />
            <Linha
              icon={MapPin}
              label="Endereço"
              valor={[posto.endereco, `${posto.cidade} · ${posto.estado}`, posto.cep].filter(Boolean).join(' — ')}
            />
            {posto.telefone && <Linha icon={Phone} label="Telefone" valor={posto.telefone} />}
            {posto.capacidade && <Linha icon={Droplets} label="Capacidade" valor={posto.capacidade} />}
          </div>
        </Secao>

        <Secao titulo="Condições da parceria">
          <div className="grid sm:grid-cols-2 gap-4">
            <Linha icon={CalendarClock} label="Ciclo de faturamento" valor={posto.ciclo} />
            <Linha icon={CalendarClock} label="Prazo de recebimento" valor={`${posto.prazoRecebimento} dias`} />
            <Linha
              icon={CreditCard}
              label="Limite de crédito"
              valor={posto.limiteCredito != null ? formatBRL(posto.limiteCredito) : 'Sem limite definido'}
            />
            {posto.volumeMinimo != null && (
              <Linha
                icon={Fuel}
                label="Volume mínimo"
                valor={`${posto.volumeMinimo.toLocaleString('pt-BR')} L`}
              />
            )}
          </div>
        </Secao>

        <Secao titulo="Abastecimento">
          <p className="text-[11px] text-gray-400 mb-2">Combustíveis acordados nesta parceria</p>
          {posto.combustiveis.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {posto.combustiveis.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum combustível ativo nesta parceria.</p>
          )}

          {posto.combustiveisPosto.length > 0 && (
            <>
              <p className="text-[11px] text-gray-400 mt-4 mb-2">Disponíveis no posto</p>
              <div className="flex flex-wrap gap-1.5">
                {posto.combustiveisPosto.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </>
          )}
        </Secao>

        {posto.podeAvaliar && (
          <Secao titulo={posto.minhaAvaliacao ? 'Sua avaliação' : 'Avaliar este posto'}>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
              <EstrelasInput valor={nota} onChange={(n) => { setNota(n); setSalvo(false) }} disabled={salvando} />

              <textarea
                value={comentario}
                onChange={(e) => { setComentario(e.target.value.slice(0, 500)); setSalvo(false) }}
                disabled={salvando}
                rows={3}
                maxLength={500}
                placeholder="Como foi sua experiência? (opcional)"
                className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none disabled:bg-gray-50"
              />

              {erro && <p className="text-xs text-red-600">{erro}</p>}

              <div className="flex items-center gap-3">
                <Button size="sm" onClick={enviarAvaliacao} disabled={nota < 1} isLoading={salvando}>
                  {posto.minhaAvaliacao ? 'Atualizar avaliação' : 'Enviar avaliação'}
                </Button>
                {salvo && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <Check size={14} /> Avaliação salva
                  </span>
                )}
                <span className="ml-auto text-[11px] text-gray-400">{comentario.length}/500</span>
              </div>
            </div>
          </Secao>
        )}

        {/* Ações — "Emitir requisição" só aparece quando a API aceitaria a criação. */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {posto.podeEmitirRequisicao && (
            <Link href={`/empresa/requisicoes/nova?parceriaId=${posto.parceriaId}`}>
              <Button variant="primary" size="sm">
                <ClipboardCheck size={15} />
                Emitir requisição
              </Button>
            </Link>
          )}
          <Link href="/empresa/parcerias">
            <Button variant="secondary" size="sm">
              <FileText size={15} />
              Ver parceria
            </Button>
          </Link>
          <Link href={`/empresa/historico?postoId=${posto.postoId}`}>
            <Button variant="secondary" size="sm">
              <BarChart2 size={15} />
              Ver histórico
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  )
}
