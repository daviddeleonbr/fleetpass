import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { data: conta } = await supabase
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 })

    // Lê status atual
    const svc = createServiceClient()
    const { data: current } = await svc
      .from('postos')
      .select('status')
      .eq('id', id)
      .eq('conta_posto_id', conta.id)
      .single()

    if (!current) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    const novoStatus = current.status === 'ativo' ? 'inativo' : 'ativo'

    const { data: posto, error: updateError } = await svc
      .from('postos')
      .update({ status: novoStatus })
      .eq('id', id)
      .eq('conta_posto_id', conta.id)
      .select()
      .single()

    if (updateError) throw updateError
    return NextResponse.json({ posto })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
