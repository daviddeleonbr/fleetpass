'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Fuel } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Resolução de imagens da Vitrine.
 *
 * Nada aqui depende de coluna nova no banco — os arquivos são estáticos, e cada
 * componente cai num fallback desenhado quando faltarem: a tela nunca quebra.
 *
 *   public/postos/posto-NN.jpg    → fotos ILUSTRATIVAS de capa dos cards,
 *                                   sorteadas pelo id do posto (ver PostoFoto)
 *   public/bandeiras/<slug>.png   → logo da bandeira (quadrado, fundo transparente)
 *
 * (O banner da Vitrine não passa por aqui: é a arte pronta em
 *  `public/vitrine/banner-v2.jpg`, usada inteira em `empresa/vitrine/page.tsx`.)
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

/**
 * Fotos genéricas disponíveis em `public/postos/`.
 *
 * Cada entrada é uma CENA DIFERENTE — nada de espelhamento, que só produzia a
 * mesma foto invertida. Para acrescentar: solte `posto-05.jpg` na pasta e
 * adicione a linha correspondente aqui.
 *
 * ATENÇÃO ao TROCAR uma foto: use um nome NOVO em vez de sobrescrever o arquivo.
 * O otimizador do Next e o navegador cacheiam pela URL, então reaproveitar o
 * nome continua servindo a imagem antiga — já aconteceu duas vezes aqui.
 *
 * Os quatro arquivos são 962x395 (2.435:1), praticamente a mesma proporção do
 * container do card (12/5 = 2.40). O object-cover corta ~1,5% da largura, então
 * `object-center` preserva a composição inteira nas quatro — cobertura, bombas,
 * loja e entorno. `posicao` fica disponível caso um asset futuro precise de
 * enquadramento diferente.
 */
const FOTOS_GENERICAS: { arquivo: string; posicao: string }[] = [
  { arquivo: '/postos/posto-01.jpg', posicao: 'object-center' }, // entardecer, toldo âmbar
  { arquivo: '/postos/posto-02.jpg', posicao: 'object-center' }, // noturno, toldo turquesa
  { arquivo: '/postos/posto-03.jpg', posicao: 'object-center' }, // dia, céu claro
  { arquivo: '/postos/posto-04.jpg', posicao: 'object-center' }, // amanhecer na rodovia
]

export const TOTAL_FOTOS = FOTOS_GENERICAS.length

/**
 * Foto genérica por POSIÇÃO, não por hash.
 *
 * O hash colidia: com poucos assets, dois postos vizinhos caíam na mesma
 * imagem. Distribuindo por índice, cada posto de uma lista recebe uma cena
 * distinta enquanto houver fotos disponíveis.
 */
export function fotoGenerica(indice: number): { arquivo: string; posicao: string } {
  const i = ((indice % TOTAL_FOTOS) + TOTAL_FOTOS) % TOTAL_FOTOS
  return FOTOS_GENERICAS[i]
}

/**
 * Capa do card e do modal.
 *
 * `postos` não tem coluna de imagem, então quem chama resolve a foto e passa
 * pronta — assim card e modal mostram sempre a mesma. Se um dia existir foto
 * cadastrada, basta passá-la em `src`, sem tocar neste componente.
 */
export function PostoFoto({
  src, posicao = 'object-center', nome, className,
}: {
  src: string
  posicao?: string
  nome: string
  className?: string
}) {
  const [falhou, setFalhou] = useState(false)

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-petrol-800 to-petrol-950', className)}>
      {!falhou ? (
        <Image
          src={src}
          alt={`Imagem ilustrativa de posto de combustível — ${nome}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 640px"
          className={cn('object-cover', posicao)}
          onError={() => setFalhou(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Fuel size={30} className="text-white/25" />
        </div>
      )}
      {/* Gradiente curto no rodapé: dá contraste ao badge e costura a foto ao
          corpo do card, em vez de deixar uma faixa com corte seco. */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  )
}
