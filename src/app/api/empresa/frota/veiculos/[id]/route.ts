import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

// PATCH /api/empresa/frota/veiculos/[id] — edita veículo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Confirma que o veículo pertence à empresa
    const { data: check } = await svc
      .from('veiculos').select('id').eq('id', id).eq('empresa_id', empresa.id).single()
    if (!check) return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 })

    const body = await req.json() as {
      modelo?: string
      combustivel?: string
      limite_mensal?: number | null
      motorista_padrao_id?: string | null
      exigir_quilometragem?: boolean
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {}
    if (body.modelo               !== undefined) patch.modelo               = body.modelo.trim()
    if (body.combustivel          !== undefined) patch.combustivel          = body.combustivel
    if ('limite_mensal'           in body)       patch.limite_mensal        = body.limite_mensal ?? null
    if ('motorista_padrao_id'     in body)       patch.motorista_padrao_id  = body.motorista_padrao_id ?? null
    if (body.exigir_quilometragem !== undefined) patch.exigir_quilometragem = body.exigir_quilometragem

    const { data, error } = await svc
      .from('veiculos')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ veiculo: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/empresa/frota/veiculos/[id] — soft delete (status = 'inativo')
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: check } = await svc
      .from('veiculos').select('id').eq('id', id).eq('empresa_id', empresa.id).single()
    if (!check) return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 })

    const { error } = await svc
      .from('veiculos')
      .update({ status: 'inativo' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
