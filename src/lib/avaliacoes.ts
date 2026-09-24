import type { createServiceClient } from './supabase-server'

type Svc = ReturnType<typeof createServiceClient>

export interface NotaPosto {
  media: number
  total: number
}

/**
 * Média de avaliações por posto, para o conjunto de ids informado.
 *
 * Uma query só; a agregação fica em JS porque o conjunto é pequeno (os postos
 * que a empresa vê na vitrine). Se a plataforma crescer, trocar por RPC de
 * agregação como em `20260317000008_rpc_agregacoes.sql`.
 */
export async function buscarNotas(svc: Svc, postoIds: string[]): Promise<Map<string, NotaPosto>> {
  const notas = new Map<string, NotaPosto>()
  if (postoIds.length === 0) return notas

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (svc as any)
    .from('avaliacoes')
    .select('posto_id, nota')
    .in('posto_id', postoIds)

  if (error) console.error('[avaliacoes buscarNotas]', error)

  const soma = new Map<string, { total: number; qtd: number }>()
  for (const a of (data ?? []) as Array<{ posto_id: string; nota: number }>) {
    const acc = soma.get(a.posto_id) ?? { total: 0, qtd: 0 }
    acc.total += a.nota
    acc.qtd   += 1
    soma.set(a.posto_id, acc)
  }

  for (const [postoId, { total, qtd }] of soma) {
    notas.set(postoId, { media: Math.round((total / qtd) * 10) / 10, total: qtd })
  }
  return notas
}

export interface ComentarioAvaliacao {
  nota: number
  comentario: string
  autor: string
  data: string
}

/**
 * Comentários públicos de um posto, do mais recente para o mais antigo.
 * O nome da empresa autora aparece porque a avaliação é pública por natureza
 * (policy "avaliacoes: public read" libera leitura a qualquer autenticado).
 */
export async function buscarComentarios(svc: Svc, postoId: string, limite = 5): Promise<ComentarioAvaliacao[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (svc as any)
    .from('avaliacoes')
    .select('nota, comentario, created_at, empresas(nome_empresa)')
    .eq('posto_id', postoId)
    .not('comentario', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) console.error('[avaliacoes buscarComentarios]', error)

  return ((data ?? []) as Array<{
    nota: number; comentario: string | null; created_at: string
    empresas: { nome_empresa: string } | null
  }>)
    .filter((a) => a.comentario?.trim())
    .map((a) => ({
      nota: a.nota,
      comentario: a.comentario!.trim(),
      autor: a.empresas?.nome_empresa ?? 'Empresa parceira',
      data: new Date(a.created_at).toLocaleDateString('pt-BR'),
    }))
}

/**
 * Avaliação que ESTA empresa já deixou para cada posto — para a tela poder
 * mostrar "sua nota" e permitir edição (há UNIQUE (posto_id, empresa_id)).
 */
export async function buscarMinhasAvaliacoes(
  svc: Svc,
  empresaId: string,
  postoIds: string[],
): Promise<Map<string, { nota: number; comentario: string | null }>> {
  const minhas = new Map<string, { nota: number; comentario: string | null }>()
  if (postoIds.length === 0) return minhas

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (svc as any)
    .from('avaliacoes')
    .select('posto_id, nota, comentario')
    .eq('empresa_id', empresaId)
    .in('posto_id', postoIds)

  if (error) console.error('[avaliacoes buscarMinhasAvaliacoes]', error)

  for (const a of (data ?? []) as Array<{ posto_id: string; nota: number; comentario: string | null }>) {
    minhas.set(a.posto_id, { nota: a.nota, comentario: a.comentario })
  }
  return minhas
}
