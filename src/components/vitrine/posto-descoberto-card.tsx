'use client'

import { MapPin, Fuel, History, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Estrelas } from './estrelas'
import { BandeiraLogo, PostoFoto } from './midia'
import type { PostoDescoberto } from './types'

/**
 * Card de posto SEM parceria vigente.
 *
 * Não há ação de parceria: a transportadora não inicia relacionamento no
 * FleetPass — quem convida é o posto. A única ação é abrir o detalhe.
 */
export function PostoDescobertoCard({
  posto,
  onAbrir,
}: {
  posto: PostoDescoberto
  onAbrir: (postoId: string) => void
}) {
  return (
    <article className="group bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      <div className="relative">
        <PostoFoto bandeira={posto.bandeira} nome={posto.nome} className="h-32 w-full" />
        {posto.jaFoiParceiro && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-gray-600 shadow-sm">
            <History size={11} />
            Parceria encerrada
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3.5 flex-1">
        <div className="flex items-start gap-3">
          <BandeiraLogo bandeira={posto.bandeira} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">{posto.nome}</h3>
            <Estrelas nota={posto.nota} total={posto.totalAvaliacoes} className="mt-1" />
          </div>
        </div>

        <div className="space-y-0.5">
          <p className="flex items-start gap-1.5 text-sm text-gray-700">
            <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <span>{posto.cidade} · {posto.estado}</span>
          </p>
          {posto.endereco && (
            <p className="text-xs text-gray-400 ml-[22px] leading-snug">{posto.endereco}</p>
          )}
        </div>

        {posto.combustiveis.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {posto.combustiveis.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-600"
              >
                <Fuel size={10} className="text-gray-400" />
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onAbrir(posto.postoId)}
          >
            Ver detalhes
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </article>
  )
}
