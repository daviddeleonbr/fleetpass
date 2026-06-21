import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const body = await req.json()
    const { bloquear, motivo } = body as { bloquear: boolean; motivo?: string }

    const svc = createServiceClient()

    // Verify ownership: parceria must belong to one of user's postos
    const { data: parceria } = await svc
      .from('parcerias')
      .select('id, status, posto_id')
      .eq('id', id)
      .single()

    if (!parceria) return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })

    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()

    if (!conta) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

    const { data: posto } = await svc
      .from('postos')
      .select('id')
      .eq('id', parceria.posto_id)
      .eq('conta_posto_id', conta.id)
      .single()

    if (!posto) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    const novoStatus = bloquear ? 'suspensa' : 'ativa'
    const { data: updated, error: updateError } = await svc
      .from('parcerias')
      .update({ status: novoStatus })
      .eq('id', id)
      .select('id, status')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ parceria: updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
