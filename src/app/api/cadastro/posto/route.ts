import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { nome, email, senha, telefone, cargo } = body

  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: nome, email, senha.' },
      { status: 400 }
    )
  }

  if (senha.length < 6) {
    return NextResponse.json(
      { error: 'A senha deve ter no mínimo 6 caracteres.' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Cria usuário no Supabase Auth.
  // O trigger `handle_new_user` em auth.users cria o registro em `perfis`
  // automaticamente usando os campos abaixo de user_metadata.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      role:     'posto',
      nome,
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

  return NextResponse.json({ userId: authData.user.id, email })
}
