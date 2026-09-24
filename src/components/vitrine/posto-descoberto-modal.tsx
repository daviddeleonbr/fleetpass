'use client'

import { useEffect, useState } from 'react'
import { MapPin, Fuel, Droplets, Loader2, Info, Quote } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Estrelas } from './estrelas'
import { BandeiraLogo, PostoFoto } from './midia'
import type { PostoDescobertoDetalhe } from './types'

/**
 * Detalhe de um posto sem parceria. Somente leitura e sem dado de contato:
 * não há CNPJ, telefone nem condição comercial, e nenhuma ação de parceria.
 */
/**
 * O pai monta este componente com key={postoId}, então cada posto abre uma
 * instância nova — não há estado antigo para limpar e o efeito nunca precisa
 * chamar setState de forma síncrona.
 */
export function PostoDescobertoModal({
  postoId,
  onClose,
}: {
  postoId: string
  onClose: () => void
}) {
  const [posto, setPosto]     = useState<PostoDescobertoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    fetch(`/api/empresa/vitrine/descobrir/${postoId}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Não foi possível carregar o posto.')
        return d
      })
      .then((d) => { if (!cancelado) setPosto(d.posto) })
      .catch((e) => { if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar.') })
      .finally(() => { if (!cancelado) setLoading(false) })

    return () => { cancelado = true }
  }, [postoId])

  return (
    <Modal isOpen onClose={onClose} title={posto?.nome ?? 'Posto'} size="lg">
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!loading && erro && <p className="text-sm text-red-600 py-4">{erro}</p>}

      {!loading && !erro && posto && (
        <div className="space-y-6">
          <PostoFoto bandeira={posto.bandeira} nome={posto.nome} className="h-40 w-full rounded-xl" />

          <div className="flex items-center gap-3">
            <BandeiraLogo bandeira={posto.bandeira} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{posto.bandeira}</p>
              <Estrelas nota={posto.nota} total={posto.totalAvaliacoes} className="mt-0.5" />
            </div>
          </div>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Localização</h4>
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800">
                {[posto.endereco, `${posto.cidade} · ${posto.estado}`, posto.cep].filter(Boolean).join(' — ')}
              </p>
            </div>
            {posto.capacidade && (
              <div className="flex items-start gap-2.5 mt-3">
                <Droplets size={15} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-800">{posto.capacidade}</p>
              </div>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Combustíveis</h4>
            {posto.combustiveis.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {posto.combustiveis.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700"
                  >
                    <Fuel size={11} className="text-gray-400" />
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Não informado.</p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              O que dizem as transportadoras
            </h4>
            {posto.comentarios.length > 0 ? (
              <ul className="space-y-3">
                {posto.comentarios.map((c, i) => (
                  <li key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Estrelas nota={c.nota} size={13} ocultarTotal />
                      <span className="text-[11px] text-gray-400">{c.data}</span>
                    </div>
                    <p className="flex gap-2 mt-2 text-sm text-gray-700">
                      <Quote size={13} className="text-gray-300 shrink-0 mt-1" />
                      {c.comentario}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2 ml-[21px]">{c.autor}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Este posto ainda não recebeu avaliações.</p>
            )}
          </section>

          <p className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <Info size={14} className="text-gray-400 shrink-0 mt-px" />
            Você ainda não tem parceria com este posto. O convite para uma nova
            parceria parte sempre do posto — não é possível solicitá-la por aqui.
          </p>
        </div>
      )}
    </Modal>
  )
}
