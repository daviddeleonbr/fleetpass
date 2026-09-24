/** Formato retornado por GET /api/empresa/vitrine. */
export interface PostoVitrine {
  parceriaId: string
  parceriaStatus: string
  postoId: string

  nome: string
  bandeira: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string | null
  telefone: string | null
  capacidade: string | null
  postoStatus: string

  disponibilidade: 'disponivel' | 'atencao' | 'indisponivel'
  podeEmitirRequisicao: boolean

  combustiveis: string[]
  combustiveisPosto: string[]

  ciclo: string
  prazoRecebimento: number
  limiteCredito: number | null
  volumeMinimo: number | null

  desde: string

  nota: number | null
  totalAvaliacoes: number
  minhaAvaliacao: { nota: number; comentario: string | null } | null
  podeAvaliar: boolean
}

/**
 * Projeção REDUZIDA de um posto sem parceria vigente (aba Descobrir).
 * Não traz CNPJ, telefone, endereço nem condição comercial — de propósito.
 */
export interface PostoDescoberto {
  postoId: string
  nome: string
  bandeira: string
  endereco: string
  cidade: string
  estado: string
  lat: number | null
  lng: number | null
  capacidade: string | null
  combustiveis: string[]
  nota: number | null
  totalAvaliacoes: number
  jaFoiParceiro: boolean
}

export interface ComentarioPublico {
  nota: number
  comentario: string
  autor: string
  data: string
}

export interface PostoDescobertoDetalhe extends Omit<PostoDescoberto, 'jaFoiParceiro'> {
  cep: string | null
  comentarios: ComentarioPublico[]
  /** Só dígitos com DDI (5527999250088). Null em posto cadastrado antes da exigência. */
  whatsapp: string | null
  /** Já existe negociação em andamento — não oferecer nova solicitação. */
  solicitacaoAberta: boolean
}

type BadgeVariant = 'ativo' | 'pendente' | 'inativo'

/**
 * Tradução do estado real (parceria + posto) para a leitura visual da vitrine.
 * Nenhum estado novo é inventado — ver o cálculo em /api/empresa/vitrine.
 */
export const DISPONIBILIDADE: Record<
  PostoVitrine['disponibilidade'],
  { label: string; badge: BadgeVariant; dot: string }
> = {
  disponivel:   { label: 'Parceria ativa', badge: 'ativo',    dot: 'bg-emerald-500' },
  atencao:      { label: 'Atenção',        badge: 'pendente', dot: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível',   badge: 'inativo',  dot: 'bg-gray-300' },
}

/** Motivo legível da indisponibilidade, para não deixar o usuário no escuro. */
export function motivoIndisponivel(p: PostoVitrine): string | null {
  if (p.podeEmitirRequisicao) return null
  if (p.parceriaStatus === 'pendente_assinatura') return 'Contrato aguardando assinatura.'
  if (p.parceriaStatus === 'suspensa') return 'Parceria suspensa pelo posto.'
  if (p.postoStatus !== 'ativo') return 'Posto temporariamente inativo.'
  return 'Indisponível para novas requisições.'
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
