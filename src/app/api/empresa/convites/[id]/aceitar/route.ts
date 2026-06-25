import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

// POST /api/empresa/convites/[id]/aceitar — ancora a solicitacao(origem='posto') via RPC
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Ownership: o convite tem de ser da empresa do usuário e estar pendente
    const { data: convite } = await svc
      .from('convites').select('id, empresa_id, posto_id, status').eq('id', id).single()
    if (!convite || convite.empresa_id !== empresa.id) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
    }
    if (convite.status !== 'pendente') {
      return NextResponse.json({ error: 'Este convite não está mais pendente.' }, { status: 409 })
    }

    // RPC valida pendência/expiração e guarda de unicidade; cria a solicitacao
    const { data: solicitacaoId, error: rpcErr } = await svc.rpc('aceitar_convite', {
      p_convite_id: id,
      p_empresa_id: empresa.id,
    })
    if (rpcErr) {
      // Erros de regra de negócio (P0001) viram 409 amigável
      return NextResponse.json({ error: errorMessage(rpcErr) }, { status: 409 })
    }

    // Notifica o posto
    try {
      const { criarNotificacao, perfilDoPosto } = await import('@/lib/notificacoes')
      const destino = await perfilDoPosto(svc, convite.posto_id)
      if (destino) {
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: 'convite_aceito',
          titulo: 'Convite aceito',
          descricao: 'A empresa convidada aceitou. Envie uma proposta para iniciar a negociação.',
          link: '/posto/parcerias/solicitacoes',
        })
      }
    } catch {}

    return NextResponse.json({ solicitacaoId })
  } catch (err) {
    console.error('[empresa/convites/[id]/aceitar]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
