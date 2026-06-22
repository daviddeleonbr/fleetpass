import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { isCpfCnpjValid, maskCpfCnpj } from '@/lib/documento'

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { nomeCompleto, email, senha, telefone, cargo, nomeEmpresa, cnpj, segmento, cidade, estado } = body

  if (!nomeCompleto || !email || !senha || !nomeEmpresa || !cnpj) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: nome, email, senha, nome da empresa, CNPJ.' },
      { status: 400 }
    )
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
  }

  if (!isCpfCnpjValid(cnpj)) {
    return NextResponse.json({ error: 'CNPJ/CPF inválido.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Cria usuário no Supabase Auth (trigger handle_new_user cria perfis automaticamente)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      role:     'empresa',
      nome:     nomeCompleto,
      telefone: telefone || null,
      cargo:    cargo    || null,
    },
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? 'Erro ao criar usuário.'
    if (msg.toLowerCase().includes('already registered')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Cria registro na tabela empresas (preserva letras do CNPJ alfanumérico)
  const cnpjFormatado = maskCpfCnpj(cnpj)

  const SEGMENTOS = [
    'Transportadora', 'Logística', 'Construção Civil', 'Agronegócio',
    'Comércio', 'Prestação de Serviços', 'Outros',
  ] as const
  const segmentoValido = (SEGMENTOS as readonly string[]).includes(segmento)
    ? (segmento as typeof SEGMENTOS[number])
    : 'Outros'

  const { error: empresaError } = await supabase
    .from('empresas')
    .insert({
      perfil_id:    userId,
      nome_empresa: nomeEmpresa,
      cnpj:         cnpjFormatado,
      // database.types.ts está com mojibake nos enums acentuados; cast aqui.
      segmento:     segmentoValido as never,
      cidade:       cidade   || '',
      estado:       estado   || '',
    })

  if (empresaError) {
    // Rollback: remove o usuário criado para não deixar órfão
    await supabase.auth.admin.deleteUser(userId)

    if (empresaError.message?.includes('unique') && empresaError.message?.includes('cnpj')) {
      return NextResponse.json({ error: 'Este CNPJ já está cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: empresaError.message }, { status: 400 })
  }

  return NextResponse.json({ userId, email }, { status: 201 })
}
