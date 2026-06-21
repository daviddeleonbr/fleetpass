import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (svc: any) => svc

async function getContext(user_id: string, motorista_id: string) {
  const svc = createServiceClient()
  const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user_id).single()
  if (!empresa) return { svc, empresa: null, moto: null, perfil: null }
  const { data: moto } = await db(svc).from('motoristas').select('id, status, bloqueado').eq('id', motorista_id).eq('empresa_id', empresa.id).single()
  const { data: perfil } = await svc.from('perfis').select('nome').eq('id', user_id).single()
  return { svc, empresa, moto, perfil }
}

// PATCH /api/empresa/frota/motoristas/[id] — edita motorista
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { svc, moto, perfil } = await getContext(user.id, id)
    if (!moto) return NextResponse.json({ error: 'Motorista não encontrado.' }, { status: 404 })

    const body = await req.json() as Record<string, unknown>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {}
    const campos = ['nome','cpf','rg','data_nascimento','telefone','email','cnh_numero','cnh_categoria','cnh_validade','vinculo','matricula','observacao']
    for (const c of campos) {
      if (c in body) patch[c] = body[c] === '' ? null : body[c]
    }
    if (patch.nome) patch.nome = String(patch.nome).trim()
    if (patch.cpf)  patch.cpf  = String(patch.cpf).replace(/\D/g, '') || null

    const { data, error } = await db(svc).from('motoristas').update(patch).eq('id', id).select().single()
    if (error) throw error

    await db(svc).from('motorista_logs').insert({
      motorista_id: id,
      acao:         'edicao',
      perfil_id:    user.id,
      perfil_nome:  perfil?.nome ?? user.id,
      detalhes:     { campos: Object.keys(patch) },
    })

    return NextResponse.json({ motorista: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/empresa/frota/motoristas/[id] — soft delete (status = inativo)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { svc, moto, perfil } = await getContext(user.id, id)
    if (!moto) return NextResponse.json({ error: 'Motorista não encontrado.' }, { status: 404 })

    const body = await req.json().catch(() => ({})) as { motivo?: string }

    const { error } = await db(svc).from('motoristas').update({ status: 'inativo' }).eq('id', id)
    if (error) throw error

    await db(svc).from('motorista_logs').insert({
      motorista_id: id,
      acao:         'inativacao',
      motivo:       body.motivo?.trim() || 'Motorista inativado.',
      perfil_id:    user.id,
      perfil_nome:  perfil?.nome ?? user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
