'use client'

import { MapPin, Fuel, CreditCard, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Estrelas } from './estrelas'
import { DISPONIBILIDADE, formatBRL, motivoIndisponivel, type PostoVitrine } from './types'

interface Props {
  posto: PostoVitrine
  onAbrir: (posto: PostoVitrine) => void
}

export function PostoCard({ posto, onAbrir }: Props) {
  const estado  = DISPONIBILIDADE[posto.disponibilidade]
  const motivo  = motivoIndisponivel(posto)
  const atenuar = !posto.podeEmitirRequisicao

  return (
    <button
      type="button"
      onClick={() => onAbrir(posto)}
      aria-label={`Ver detalhes de ${posto.nome}`}
      className={cn(
        'group w-full text-left bg-white border border-gray-100 rounded-xl shadow-sm p-5',
        'flex flex-col gap-4 transition-all',
        'hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-100',
      )}
    >
      {/* Nome é o elemento dominante; status logo ao lado. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', estado.dot)} />
            <h3 className={cn(
              'text-base font-semibold truncate',
              atenuar ? 'text-gray-500' : 'text-gray-900',
            )}>
              {posto.nome}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-4">{posto.bandeira}</p>
        </div>
        <Badge variant={estado.badge}>{estado.label}</Badge>
      </div>

      <Estrelas nota={posto.nota} total={posto.totalAvaliacoes} className="-mt-1" />

      {/* Localização */}
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin size={14} className="text-gray-400 shrink-0" />
          <span className="truncate">{posto.cidade} · {posto.estado}</span>
        </p>
        {posto.endereco && (
          <p className="text-xs text-gray-400 truncate ml-[22px]">{posto.endereco}</p>
        )}
      </div>

      {/* Combustíveis acordados na parceria */}
      {posto.combustiveis.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Fuel size={14} className="text-gray-400 shrink-0 mt-1" />
          <div className="flex flex-wrap gap-1.5">
            {posto.combustiveis.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-xs text-gray-600"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé: condição comercial + chamada de ação */}
      <div className="flex items-end justify-between gap-3 pt-3 mt-auto border-t border-gray-50">
        <div className="min-w-0">
          {posto.limiteCredito != null ? (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <CreditCard size={13} className="text-gray-400 shrink-0" />
              <span className="truncate">
                Limite <strong className="font-semibold text-gray-700">{formatBRL(posto.limiteCredito)}</strong> · {posto.ciclo}
              </span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 truncate">Ciclo {posto.ciclo}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-0.5">Parceiro desde {posto.desde}</p>
        </div>

        <span className="flex items-center gap-0.5 text-xs font-medium text-blue-600 shrink-0 group-hover:gap-1.5 transition-all">
          Detalhes
          <ChevronRight size={14} />
        </span>
      </div>

      {motivo && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 -mt-1">
          {motivo}
        </p>
      )}
    </button>
  )
}
