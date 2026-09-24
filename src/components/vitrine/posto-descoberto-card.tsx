'use client'

import { MapPin, History, ArrowRight } from 'lucide-react'
import { Estrelas } from './estrelas'
import { BandeiraLogo, PostoFoto } from './midia'
import type { PostoDescoberto } from './types'

/**
 * Card de posto SEM parceria vigente.
 *
 * Não há ação de parceria: a transportadora não inicia relacionamento no
 * FleetPass — quem convida é o posto. A única ação é abrir o detalhe.
 *
 * A foto vem resolvida de fora (`foto`) para que o modal do mesmo posto mostre
 * exatamente a mesma imagem.
 */
export function PostoDescobertoCard({
  posto,
  foto,
  onAbrir,
}: {
  posto: PostoDescoberto
  foto: { arquivo: string; posicao: string }
  onAbrir: (postoId: string) => void
}) {
  return (
    <article className="group flex flex-col bg-white border border-gray-200/70 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] overflow-hidden transition-shadow hover:shadow-[0_6px_20px_rgba(16,24,40,0.09)]">
      {/* Proporção, não altura fixa: a capa cresce junto com o card, então a
          foto mantém o mesmo enquadramento do notebook ao 2K. Com altura fixa,
          quanto mais largo o card, mais achatada a imagem ficava. Como todos os
          cards da linha têm a mesma largura, a altura também coincide. */}
      <div className="relative">
        <PostoFoto
          src={foto.arquivo}
          posicao={foto.posicao}
          nome={posto.nome}
          className="w-full aspect-[12/5]"
        />

        {posto.jaFoiParceiro && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm">
            <History size={11} />
            Parceria encerrada
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 gap-3 p-4">
        {/* Nome é o elemento textual dominante. */}
        <div className="flex items-start gap-2.5">
          <BandeiraLogo bandeira={posto.bandeira} size={38} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{posto.nome}</h3>
            <Estrelas nota={posto.nota} total={posto.totalAvaliacoes} className="mt-0.5" />
          </div>
        </div>

        <div>
          <p className="flex items-start gap-1.5 text-sm font-medium text-gray-800">
            <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
            <span>{posto.cidade} · {posto.estado}</span>
          </p>
          {posto.endereco && (
            <p className="text-xs text-gray-500 ml-[23px] leading-snug mt-0.5">{posto.endereco}</p>
          )}
        </div>

        {posto.combustiveis.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {posto.combustiveis.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200/70 text-[11px] font-medium text-gray-600"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* mt-auto prende a ação no rodapé, mesmo com quantidades diferentes
            de combustíveis entre os cards da linha. */}
        <button
          type="button"
          onClick={() => onAbrir(posto.postoId)}
          className="mt-auto w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-petrol-200 hover:bg-petrol-50 hover:text-petrol-700 focus:outline-none focus:ring-2 focus:ring-petrol-100"
        >
          Ver detalhes
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  )
}
