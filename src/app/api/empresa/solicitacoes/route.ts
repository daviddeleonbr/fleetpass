import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id, nome_empresa').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const body = await req.json()
    const { postoId, combustiveis, volumeEstimado, valorEstimado, mensagem } = body

    if (!postoId || !combustiveis?.length) {
      return NextResponse.json({ error: 'postoId e combustiveis são obrigatórios.' }, { status: 400 })
    }

    // Check for existing active solicitation
    const { data: existing } = await svc.from('solicitacoes')
      .select('id, status').eq('posto_id', postoId).eq('empresa_id', empresa.id)
      .in('status', ['aguardando', 'proposta_recebida']).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Já existe uma solicitação ativa para este posto.' }, { status: 409 })

    // Check for existing active partnership
    const { data: parceria } = await svc.from('parcerias')
      .select('id').eq('posto_id', postoId).eq('empresa_id', empresa.id).eq('status', 'ativa').maybeSingle()
    if (parceria) return NextResponse.json({ error: 'Já existe uma parceria ativa com este posto.' }, { status: 409 })

    const { data: sol, error: solError } = await svc.from('solicitacoes').insert({
      empresa_id:      empresa.id,
      posto_id:        postoId,
      combustiveis:    combustiveis,
      volume_estimado: volumeEstimado || null,
      valor_estimado:  valorEstimado ? parseFloat(String(valorEstimado).replace(/\D/g, '')) / 100 : null,
      mensagem:        mensagem || null,
      status:          'aguardando',
    }).select().single()

    if (solError) throw solError

    // Notifica o posto da nova solicitação
    try {
      const { criarNotificacao, perfilDoPosto } = await import('@/lib/notificacoes')
      const destino = await perfilDoPosto(svc, postoId)
      if (destino) {
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: 'solicitacao_nova',
          titulo: 'Nova solicitação de parceria',
          descricao: `${empresa.nome_empresa ?? 'Uma empresa'} enviou uma solicitação de parceria.`,
          link: '/posto/parcerias/solicitacoes',
        })
      }
    } catch {}

    return NextResponse.json({ solicitacao: sol }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
