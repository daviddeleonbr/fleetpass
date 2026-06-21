import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const svcAny = (svc: any) => svc

// GET /api/empresa/frota/motoristas
// ?todos=true  → todos os status (página de gestão)
// sem param    → só ativos (dropdowns)
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const todos = req.nextUrl.searchParams.get('todos') === 'true'

    let query = svcAny(svc)
      .from('motoristas')
      .select('id, nome, cpf, rg, data_nascimento, telefone, email, cnh_numero, cnh_categoria, cnh_validade, vinculo, matricula, observacao, status, bloqueado')
      .eq('empresa_id', empresa.id)
      .order('nome')

    if (!todos) query = query.eq('status', 'ativo').eq('bloqueado', false)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ motoristas: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/empresa/frota/motoristas — cadastra motorista
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: perfil } = await svc.from('perfis').select('nome').eq('id', user.id).single()

    const body = await req.json() as {
      nome: string; cpf?: string; rg?: string; data_nascimento?: string
      telefone?: string; email?: string; cnh_numero?: string
      cnh_categoria?: string; cnh_validade?: string
      vinculo?: string; matricula?: string; observacao?: string
    }

    if (!body.nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 422 })

    const { data, error } = await svcAny(svc).from('motoristas').insert({
      empresa_id:      empresa.id,
      nome:            body.nome.trim(),
      cpf:             body.cpf?.replace(/\D/g, '') || null,
      rg:              body.rg?.trim() || null,
      data_nascimento: body.data_nascimento || null,
      telefone:        body.telefone?.trim() || null,
      email:           body.email?.trim().toLowerCase() || null,
      cnh_numero:      body.cnh_numero?.trim() || null,
      cnh_categoria:   body.cnh_categoria || null,
      cnh_validade:    body.cnh_validade || null,
      vinculo:         body.vinculo || null,
      matricula:       body.matricula?.trim() || null,
      observacao:      body.observacao?.trim() || null,
      status:          'ativo',
    }).select().single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
      throw error
    }

    await svcAny(svc).from('motorista_logs').insert({
      motorista_id: data.id,
      acao:         'cadastro',
      perfil_id:    user.id,
      perfil_nome:  perfil?.nome ?? user.id,
    })

    return NextResponse.json({ motorista: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
