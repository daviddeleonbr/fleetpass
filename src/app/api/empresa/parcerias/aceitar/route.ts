import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { propostaId } = await req.json()
    if (!propostaId) return NextResponse.json({ error: 'propostaId obrigatório.' }, { status: 400 })

    const svc = createServiceClient()

    // Verify the proposta belongs to this empresa
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: proposta } = await svc
      .from('propostas')
      .select('empresa_id, solicitacao_id')
      .eq('id', propostaId)
      .single()
    if (!proposta || proposta.empresa_id !== empresa.id) {
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 })
    }

    // Call the atomic RPC
    const { data: parceiraId, error: rpcError } = await svc.rpc('aceitar_proposta', { p_proposta_id: propostaId })
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 })

    // Marca as demais propostas pendentes da mesma solicitação como 'substituida'
    await (svc as any)
      .from('propostas')
      .update({ status: 'substituida', updated_at: new Date().toISOString() })
      .eq('solicitacao_id', proposta.solicitacao_id)
      .eq('status', 'pendente')
      .neq('id', propostaId)

    // Registra evento de aceite no chat
    await (svc as any).from('parceria_mensagens').insert({
      solicitacao_id: proposta.solicitacao_id,
      autor_tipo: 'empresa',
      autor_id: empresa.id,
      tipo: 'proposta_aceita',
      proposta_id: propostaId,
    })

    // Notifica o posto
    try {
      const { criarNotificacao, perfilDoPosto } = await import('@/lib/notificacoes')
      const { data: propCompleta } = await svc.from('propostas').select('posto_id, empresa_id').eq('id', propostaId).single()
      if (propCompleta?.posto_id) {
        const destino = await perfilDoPosto(svc, propCompleta.posto_id)
        if (destino) {
          const { data: empresaRow } = await svc.from('empresas').select('nome_empresa').eq('id', propCompleta.empresa_id).maybeSingle()
          await criarNotificacao(svc, {
            perfilId: destino,
            tipo: 'proposta_aceita',
            titulo: 'Proposta aceita',
            descricao: `${(empresaRow as any)?.nome_empresa ?? 'A empresa'} aceitou sua proposta. O contrato está pronto para assinatura.`,
            link: '/posto/parcerias/solicitacoes',
          })
        }
      }
    } catch {}

    return NextResponse.json({ parceiraId })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
