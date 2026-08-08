import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

type Contexto = {
  role: 'empresa' | 'posto'
  empresaId?: string
  postoId?: string
}

/** Resolve o papel (empresa ou posto) do usuário em relação à solicitação. */
async function resolverContexto(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  solicitacaoId: string
): Promise<Contexto | null> {
  const { data: s } = await svc
    .from('solicitacoes')
    .select('id, empresa_id, posto_id')
    .eq('id', solicitacaoId)
    .single()
  if (!s) return null

  const { data: empresa } = await svc
    .from('empresas')
    .select('id')
    .eq('id', s.empresa_id)
    .eq('perfil_id', userId)
    .maybeSingle()
  if (empresa) return { role: 'empresa', empresaId: empresa.id }

  const { data: postoLink } = await svc
    .from('postos')
    .select('id, contas_posto!inner(perfil_id)')
    .eq('id', s.posto_id)
    .eq('contas_posto.perfil_id', userId)
    .maybeSingle()
  if (postoLink) return { role: 'posto', postoId: postoLink.id }

  return null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ solicitacaoId: string }> }
) {
  const { solicitacaoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const svc = createServiceClient()
  const ctx = await resolverContexto(svc, user.id, solicitacaoId)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  // Solicitação + propostas + mensagens em paralelo (antes: 3 round-trips seriais)
  const [
    { data: solicitacao },
    { data: propostas },
    { data: mensagens },
  ] = await Promise.all([
    svc.from('solicitacoes').select(`
      id, status, mensagem, combustiveis, volume_estimado, valor_estimado,
      empresa_id, posto_id,
      empresas ( nome_empresa ),
      postos   ( nome )
    `).eq('id', solicitacaoId).single(),
    svc.from('propostas').select('*').eq('solicitacao_id', solicitacaoId).order('versao', { ascending: false }),
    svc.from('parceria_mensagens' as any).select('*').eq('solicitacao_id', solicitacaoId).order('created_at', { ascending: true }),
  ])

  // Marca como lidas as mensagens da contraparte
  const naoLidas = ((mensagens ?? []) as any[])
    .filter(m => !m.lida_em && m.autor_tipo !== ctx.role)
    .map(m => m.id)
  if (naoLidas.length > 0) {
    await svc
      .from('parceria_mensagens' as any)
      .update({ lida_em: new Date().toISOString() })
      .in('id', naoLidas)
  }

  return NextResponse.json({
    contexto: ctx,
    solicitacao,
    propostas: propostas ?? [],
    mensagens: mensagens ?? [],
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ solicitacaoId: string }> }
) {
  const { solicitacaoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const svc = createServiceClient()
  const ctx = await resolverContexto(svc, user.id, solicitacaoId)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await req.json()
  const conteudo = (body?.conteudo ?? '').toString().trim()
  if (!conteudo) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })

  const autorId = ctx.role === 'empresa' ? ctx.empresaId! : ctx.postoId!

  const { data: msg, error } = await svc
    .from('parceria_mensagens' as any)
    .insert({
      solicitacao_id: solicitacaoId,
      autor_tipo: ctx.role,
      autor_id: autorId,
      tipo: 'mensagem',
      conteudo,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Quando a empresa inicia conversa sobre uma proposta pendente, marca solicitação como em_negociacao
  await (svc as any)
    .from('solicitacoes')
    .update({ status: 'em_negociacao', updated_at: new Date().toISOString() })
    .eq('id', solicitacaoId)
    .in('status', ['proposta_recebida'])

  // Notifica a contraparte
  try {
    const { criarNotificacao, perfilDaEmpresa, perfilDoPosto } = await import('@/lib/notificacoes')
    const { data: solData } = await svc
      .from('solicitacoes')
      .select('empresa_id, posto_id, empresas(nome_empresa), postos(nome)')
      .eq('id', solicitacaoId)
      .single()
    if (solData) {
      const destino = ctx.role === 'empresa'
        ? await perfilDoPosto(svc, (solData as any).posto_id)
        : await perfilDaEmpresa(svc, (solData as any).empresa_id)
      const remetente = ctx.role === 'empresa'
        ? (solData as any).empresas?.nome_empresa ?? 'A empresa'
        : (solData as any).postos?.nome ?? 'O posto'
      if (destino) {
        const snippet = conteudo.length > 80 ? conteudo.slice(0, 80) + '…' : conteudo
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: 'mensagem_negociacao',
          titulo: `Nova mensagem de ${remetente}`,
          descricao: snippet,
          link: ctx.role === 'empresa' ? '/posto/parcerias/solicitacoes' : '/empresa/parcerias',
        })
      }
    }
  } catch {}

  return NextResponse.json({ mensagem: msg })
}
