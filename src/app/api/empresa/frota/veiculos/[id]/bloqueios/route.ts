import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/empresa/frota/veiculos/[id]/bloqueios — histórico de bloqueios
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

    const { data: veiculo } = await svc
      .from('veiculos').select('id').eq('id', id).eq('empresa_id', empresa.id).single()
    if (!veiculo) return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 })

    const { data, error } = await svc
      .from('veiculo_bloqueios')
      .select('id, acao, tipo, motivo, perfil_nome, created_at')
      .eq('veiculo_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ logs: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
