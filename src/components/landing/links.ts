/**
 * Rotas dos CTAs por público. Centralizado para apontar facilmente cada
 * público ao seu fluxo de cadastro. (Transportadora = cadastro de empresa.)
 */
export const LINKS = {
  transportadora: '/cadastro/empresa',
  posto:          '/cadastro/posto',
  login:          '/login',
  contato:        'mailto:contato@fuellink.com.br',
  // +55 27 99925-0088 — o wa.me exige só dígitos, com código do país e sem sinais.
  whatsapp:       'https://wa.me/5527999250088',
} as const
