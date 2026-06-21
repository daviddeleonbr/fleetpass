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
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { error } = await svc.from('propostas')
      .update({ status: 'rejeitada' })
      .eq('id', propostaId)
      .eq('empresa_id', empresa.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
