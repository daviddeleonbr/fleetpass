/**
 * Rotas dos CTAs por público. Centralizado para apontar facilmente cada
 * público ao seu fluxo de cadastro. (Transportadora = cadastro de empresa.)
 */
export const LINKS = {
  transportadora: '/cadastro/empresa',
  posto:          '/cadastro/posto',
  login:          '/login',
  contato:        'mailto:contato@fuellink.com.br',
} as const
