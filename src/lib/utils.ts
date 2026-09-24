import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Máscara de telefone brasileiro com DDD. Aceita fixo (00) 0000-0000 e
 * celular (00) 00000-0000 — formata progressivamente conforme digita.
 */
export function maskTelefone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Normaliza um WhatsApp brasileiro para o formato que o wa.me exige:
 * só dígitos, com DDI 55 na frente. Devolve null se não for um número válido.
 *
 * Aceita "(27) 99925-0088", "27999250088" ou "+55 27 99925-0088".
 * Exige DDD (2) + celular de 9 dígitos começando em 9 — telefone fixo não tem
 * WhatsApp e geraria um link morto.
 */
export function normalizarWhatsapp(value: string): string | null {
  let d = value.replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  if (d.length !== 11) return null
  if (d[2] !== '9') return null
  return `55${d}`
}

/** Formata para exibição: 5527999250088 → (27) 99925-0088 */
export function exibirWhatsapp(e164: string): string {
  const d = e164.replace(/\D/g, '').replace(/^55/, '')
  return maskTelefone(d)
}
