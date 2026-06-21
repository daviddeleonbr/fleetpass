import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: solicitacaoId } = await params

    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: solicitacao } = await svc.from('solicitacoes')
      .select('id, posto_id').eq('id', solicitacaoId).single()
    if (!solicitacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })

    const { data: posto } = await svc.from('postos').select('id')
      .eq('id', solicitacao.posto_id).eq('conta_posto_id', conta.id).single()
    if (!posto) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    const { error } = await svc.from('solicitacoes')
      .update({ status: 'rejeitada' }).eq('id', solicitacaoId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
