import { createServiceClient } from '@/lib/supabase-server'

export type NotificacaoTipo =
  | 'solicitacao_nova'
  | 'proposta_recebida'
  | 'proposta_revisada'
  | 'proposta_aceita'
  | 'proposta_rejeitada'
  | 'mensagem_negociacao'
  | 'contrato_pronto'
  | 'contrato_assinado_contraparte'
  | 'parceria_ativa'
  | 'parceria_suspensa'
  | 'parceria_encerrada'

interface NotificacaoInput {
  perfilId: string
  tipo: NotificacaoTipo
  titulo: string
  descricao?: string
  link?: string
}

/** Cria uma notificação para o usuário. Silencia erros para não quebrar o fluxo principal. */
export async function criarNotificacao(svc: ReturnType<typeof createServiceClient>, input: NotificacaoInput) {
  try {
    await (svc as any).from('notificacoes').insert({
      perfil_id: input.perfilId,
      tipo:      input.tipo,
      titulo:    input.titulo,
      descricao: input.descricao ?? null,
      link:      input.link ?? null,
    })
  } catch (err) {
    console.error('[notificacoes] erro ao criar:', err)
  }
}

/** Resolve o perfil_id da empresa. */
export async function perfilDaEmpresa(svc: ReturnType<typeof createServiceClient>, empresaId: string): Promise<string | null> {
  const { data } = await svc.from('empresas').select('perfil_id').eq('id', empresaId).maybeSingle()
  return (data as any)?.perfil_id ?? null
}

/** Resolve o perfil_id da conta do posto (dono). */
export async function perfilDoPosto(svc: ReturnType<typeof createServiceClient>, postoId: string): Promise<string | null> {
  const { data: posto } = await svc
    .from('postos')
    .select('conta_posto_id')
    .eq('id', postoId)
    .maybeSingle()
  if (!posto) return null
  const { data: conta } = await svc
    .from('contas_posto')
    .select('perfil_id')
    .eq('id', (posto as any).conta_posto_id)
    .maybeSingle()
  return (conta as any)?.perfil_id ?? null
}
