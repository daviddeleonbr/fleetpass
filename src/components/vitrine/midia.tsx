'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Fuel } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Resolução de imagens da Vitrine.
 *
 * Nada aqui depende de coluna nova no banco: os arquivos são estáticos e
 * resolvidos pelo enum `posto_bandeira`. Enquanto não existirem, cada
 * componente cai num fallback desenhado — a tela nunca quebra.
 *
 * Para ativar, basta soltar os arquivos em `public/`:
 *   public/bandeiras/<slug>.png   → logo da bandeira (quadrado, fundo transparente)
 *   public/postos/<slug>.jpg      → foto de capa do card
 *   public/postos/default.jpg     → capa usada quando não houver a da bandeira
 *
 * (O banner da Vitrine não passa por aqui: é a arte pronta em
 *  `public/vitrine/banner.jpg`, usada inteira em `empresa/vitrine/page.tsx`.)
 *
 * slug = bandeira em minúsculas e sem acento: shell, ipiranga, petrobras,
 * vibra, raizen, independente.
 */
export function slugBandeira(bandeira: string): string {
  return bandeira
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Cor de apoio por bandeira, usada no fallback quando não há logo. */
const COR_BANDEIRA: Record<string, string> = {
  shell:        'bg-amber-100 text-amber-700',
  ipiranga:     'bg-blue-100 text-blue-700',
  petrobras:    'bg-emerald-100 text-emerald-700',
  vibra:        'bg-teal-100 text-teal-700',
  raizen:       'bg-orange-100 text-orange-700',
  independente: 'bg-gray-100 text-gray-600',
}

export function BandeiraLogo({ bandeira, size = 40 }: { bandeira: string; size?: number }) {
  const [falhou, setFalhou] = useState(false)
  const slug = slugBandeira(bandeira)

  if (falhou) {
    return (
      <span
        title={bandeira}
        style={{ width: size, height: size }}
        className={cn(
          'shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border border-black/5',
          COR_BANDEIRA[slug] ?? COR_BANDEIRA.independente,
        )}
      >
        {bandeira.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="shrink-0 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden"
    >
      <Image
        src={`/bandeiras/${slug}.png`}
        alt={bandeira}
        width={size}
        height={size}
        className="object-contain p-1"
        onError={() => setFalhou(true)}
      />
    </span>
  )
}

/** Capa do card. Tenta a foto da bandeira, depois a padrão, depois o gradiente. */
export function PostoFoto({ bandeira, nome, className }: { bandeira: string; nome: string; className?: string }) {
  const [etapa, setEtapa] = useState<0 | 1 | 2>(0)
  const slug = slugBandeira(bandeira)
  const src  = etapa === 0 ? `/postos/${slug}.jpg` : '/postos/default.jpg'

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-petrol-700 to-petrol-950', className)}>
      {etapa < 2 && (
        <Image
          src={src}
          alt={`Fachada do ${nome}`}
          fill
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
          onError={() => setEtapa((e) => (e === 0 ? 1 : 2))}
        />
      )}
      {etapa === 2 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Fuel size={30} className="text-white/25" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  )
}
