import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/** GET — lista 20 notificações mais recentes + contador de não lidas. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ items: [], naoLidas: 0 })

    const svc = createServiceClient()
    // Lista + contador de não lidas em paralelo
    const [{ data: items }, { count }] = await Promise.all([
      (svc as any).from('notificacoes').select('*')
        .eq('perfil_id', user.id).order('created_at', { ascending: false }).limit(20),
      (svc as any).from('notificacoes').select('id', { count: 'exact', head: true })
        .eq('perfil_id', user.id).is('lida_em', null),
    ])

    return NextResponse.json({ items: items ?? [], naoLidas: count ?? 0 })
  } catch (err) {
    return NextResponse.json({ items: [], naoLidas: 0, error: String(err) })
  }
}

/** PATCH — marca uma ou todas as notificações do usuário como lidas. */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const body = await req.json().catch(() => ({}))
    const { id, todas } = body as { id?: string; todas?: boolean }

    const agora = new Date().toISOString()
    let query = (svc as any).from('notificacoes').update({ lida_em: agora }).eq('perfil_id', user.id)
    if (id) query = query.eq('id', id)
    else if (!todas) return NextResponse.json({ error: 'Informe id ou todas=true.' }, { status: 400 })
    else query = query.is('lida_em', null)

    await query
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
