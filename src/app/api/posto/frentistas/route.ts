import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

async function getPostosDoUsuario(svc: ReturnType<typeof createServiceClient>, userId: string) {
  const { data: conta } = await (svc as any).from('contas_posto').select('id').eq('perfil_id', userId).single()
  if (!conta) return null
  const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
  return postos ?? []
}

// GET — lista frentistas dos postos do usuário logado
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: ue } = await supabase.auth.getUser()
    if (ue || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const postos = await getPostosDoUsuario(svc, user.id)
    if (!postos || postos.length === 0) return NextResponse.json({ frentistas: [], postos: [] })

    const postoIds = postos.map((p: any) => p.id)

    const { data: frentistas, error } = await (svc as any)
      .from('frentistas')
      .select('id, posto_id, nome, cpf, telefone, email, turno, status, created_at, updated_at')
      .in('posto_id', postoIds)
      .order('nome', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ frentistas: frentistas ?? [], postos })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — cadastra novo frentista
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: ue } = await supabase.auth.getUser()
    if (ue || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const postos = await getPostosDoUsuario(svc, user.id)
    if (!postos || postos.length === 0) return NextResponse.json({ error: 'Sem postos vinculados.' }, { status: 403 })

    const body = await req.json()
    const { postoId, nome, cpf, telefone, email, turno, senha } = body

    if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    if (!postoId) return NextResponse.json({ error: 'Posto é obrigatório.' }, { status: 400 })
    if (!email?.trim()) return NextResponse.json({ error: 'Email é obrigatório para criar o acesso.' }, { status: 400 })
    if (!senha?.trim()) return NextResponse.json({ error: 'Senha é obrigatória para criar o acesso.' }, { status: 400 })

    // Verifica se o posto pertence ao usuário
    const postoIds = postos.map((p: any) => p.id)
    if (!postoIds.includes(postoId)) return NextResponse.json({ error: 'Posto não pertence ao usuário.' }, { status: 403 })

    // Cria o usuário no auth do Supabase
    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email: email.trim(),
      password: senha.trim(),
      email_confirm: true,
      user_metadata: { role: 'frentista', nome: nome.trim() },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

    const authUserId = authData.user.id

    // Aguarda o trigger criar o perfil (pequena tolerância)
    await new Promise(r => setTimeout(r, 500))

    // Busca o perfil criado pelo trigger
    const { data: perfil } = await svc.from('perfis').select('id').eq('id', authUserId).single()

    // Insere o frentista vinculando ao perfil
    const { data: frentista, error } = await (svc as any)
      .from('frentistas')
      .insert({
        posto_id: postoId,
        nome: nome.trim(),
        cpf: cpf?.trim() || null,
        telefone: telefone?.trim() || null,
        email: email.trim(),
        turno: turno?.trim() || null,
        status: 'ativo',
        perfil_id: perfil?.id ?? null,
      })
      .select()
      .single()

    if (error) {
      // Reverte o usuário criado no auth se o insert falhar
      await svc.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ frentista }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH — edita ou inativa frentista
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: ue } = await supabase.auth.getUser()
    if (ue || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const postos = await getPostosDoUsuario(svc, user.id)
    if (!postos || postos.length === 0) return NextResponse.json({ error: 'Sem postos vinculados.' }, { status: 403 })

    const body = await req.json()
    const { id, postoId, nome, cpf, telefone, email, turno, status } = body

    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 })

    // Verifica que o frentista pertence a um posto do usuário
    const postoIds = postos.map((p: any) => p.id)
    const { data: existing } = await (svc as any)
      .from('frentistas')
      .select('id, posto_id')
      .eq('id', id)
      .single()

    if (!existing || !postoIds.includes(existing.posto_id))
      return NextResponse.json({ error: 'Frentista não encontrado.' }, { status: 404 })

    // Monta o objeto de atualização
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (nome !== undefined) updates.nome = nome.trim()
    if (cpf !== undefined) updates.cpf = cpf.trim() || null
    if (telefone !== undefined) updates.telefone = telefone.trim() || null
    if (email !== undefined) updates.email = email.trim() || null
    if (turno !== undefined) updates.turno = turno.trim() || null
    if (status !== undefined) updates.status = status
    if (postoId !== undefined) {
      if (!postoIds.includes(postoId)) return NextResponse.json({ error: 'Posto inválido.' }, { status: 403 })
      updates.posto_id = postoId
    }

    const { data: updated, error } = await (svc as any)
      .from('frentistas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ frentista: updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
