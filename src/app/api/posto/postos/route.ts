import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

// GET /api/posto/postos — lista enxuta dos postos ativos da conta (para seletores)
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc
      .from('postos').select('id, nome, combustiveis').eq('conta_posto_id', conta.id).eq('status', 'ativo')

    return NextResponse.json({
      postos: (postos ?? []).map((p: any) => ({ id: p.id, nome: p.nome, combustiveis: p.combustiveis ?? [] })),
    })
  } catch (err) {
    console.error('[posto/postos]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
