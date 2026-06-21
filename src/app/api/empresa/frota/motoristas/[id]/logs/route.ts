import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (svc: any) => svc

// GET /api/empresa/frota/motoristas/[id]/logs
export async function GET(
  _req: NextRequest,
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

    const { data: moto } = await db(svc).from('motoristas').select('id').eq('id', id).eq('empresa_id', empresa.id).single()
    if (!moto) return NextResponse.json({ error: 'Motorista não encontrado.' }, { status: 404 })

    const { data, error } = await db(svc)
      .from('motorista_logs')
      .select('id, acao, motivo, perfil_nome, detalhes, created_at')
      .eq('motorista_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ logs: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
