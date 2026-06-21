import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (svc: any) => svc

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: moto } = await db(svc).from('motoristas').select('id, bloqueado').eq('id', id).eq('empresa_id', empresa.id).single()
    if (!moto) return NextResponse.json({ error: 'Motorista não encontrado.' }, { status: 404 })
    if (!moto.bloqueado) return NextResponse.json({ error: 'Motorista não está bloqueado.' }, { status: 409 })

    const { data: perfil } = await svc.from('perfis').select('nome').eq('id', user.id).single()

    const body = await req.json() as { motivo: string }
    if (!body.motivo?.trim()) return NextResponse.json({ error: 'Motivo é obrigatório.' }, { status: 422 })

    await db(svc).from('motoristas').update({ bloqueado: false }).eq('id', id)

    await db(svc).from('motorista_logs').insert({
      motorista_id: id,
      acao:         'desbloqueio',
      motivo:       body.motivo.trim(),
      perfil_id:    user.id,
      perfil_nome:  perfil?.nome ?? user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
