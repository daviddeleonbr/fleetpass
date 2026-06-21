'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Atraso em segundos para escalonar itens. */
  delay?: number
  /** Direção da entrada. */
  y?: number
  className?: string
  as?: 'div' | 'li' | 'section' | 'article'
}

const variants: Variants = {
  hidden: (y: number) => ({ opacity: 0, y }),
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

/**
 * Envolve conteúdo com uma animação discreta de fade + slide ao entrar na
 * viewport. Anima uma única vez. Respeita prefers-reduced-motion via Framer.
 */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div' }: RevealProps) {
  const MotionTag = motion[as]
  return (
    <MotionTag
      className={className}
      custom={y}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}
