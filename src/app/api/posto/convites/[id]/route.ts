import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { enviarEmailConvite } from '@/lib/convites'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

// PATCH /api/posto/convites/[id] — { acao: 'cancelar' | 'reenviar' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    // Convite + posto, validando ownership na query (anti-IDOR)
    const { data: convite } = await svc
      .from('convites')
      .select('id, status, email_destino, token, mensagem, postos!inner ( id, nome, conta_posto_id )')
      .eq('id', id)
      .single()
    if (!convite || (convite.postos as any)?.conta_posto_id !== conta.id) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
    }
    if (convite.status !== 'pendente') {
      return NextResponse.json({ error: 'Apenas convites pendentes podem ser alterados.' }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const acao = String(body?.acao ?? '')

    if (acao === 'cancelar') {
      const { error } = await svc.from('convites').update({ status: 'cancelado' }).eq('id', id)
      if (error) throw error
      return NextResponse.json({ cancelado: true })
    }

    if (acao === 'reenviar') {
      const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const emailEnviado = await enviarEmailConvite({
        to: convite.email_destino,
        postoNome: (convite.postos as any)?.nome ?? 'Um posto parceiro',
        link: `${origin}/convite/${convite.token}`,
        mensagem: convite.mensagem,
      })
      return NextResponse.json({ reenviado: true, emailEnviado })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err) {
    console.error('[posto/convites/[id] PATCH]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
