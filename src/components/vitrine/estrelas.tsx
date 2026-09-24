'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EstrelasProps {
  nota: number | null
  total?: number
  size?: number
  /** Esconde o "(n)" quando o contexto já deixa claro. */
  ocultarTotal?: boolean
  className?: string
}

/** Exibição somente leitura. Meia-estrela é resolvida por arredondamento visual. */
export function Estrelas({ nota, total, size = 14, ocultarTotal, className }: EstrelasProps) {
  if (nota == null) {
    return <span className={cn('text-xs text-gray-400', className)}>Sem avaliações</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(nota) ? 'text-amber-400' : 'text-gray-200'}
            fill={i <= Math.round(nota) ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-gray-700">{nota.toFixed(1).replace('.', ',')}</span>
      {!ocultarTotal && total != null && (
        <span className="text-xs text-gray-400">({total})</span>
      )}
      <span className="sr-only">Nota {nota.toFixed(1)} de 5{total != null ? `, ${total} avaliações` : ''}</span>
    </span>
  )
}

interface EstrelasInputProps {
  valor: number
  onChange: (nota: number) => void
  disabled?: boolean
}

/** Seletor interativo de 1 a 5, acessível por teclado (radiogroup). */
export function EstrelasInput({ valor, onChange, disabled }: EstrelasInputProps) {
  const [hover, setHover] = useState(0)
  const exibido = hover || valor

  return (
    <div
      role="radiogroup"
      aria-label="Nota de 1 a 5"
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valor === i}
          aria-label={`${i} ${i === 1 ? 'estrela' : 'estrelas'}`}
          disabled={disabled}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className={cn(
            'p-0.5 rounded transition-transform focus:outline-none focus:ring-2 focus:ring-amber-200',
            !disabled && 'hover:scale-110 cursor-pointer',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Star
            size={26}
            className={i <= exibido ? 'text-amber-400' : 'text-gray-200'}
            fill={i <= exibido ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  )
}
