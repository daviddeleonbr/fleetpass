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

  const { nomeCompleto, email, senha, telefone, cargo, nomeEmpresa, cnpj, segmento, cidade, estado, conviteToken } = body

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

  const { data: novaEmpresa, error: empresaError } = await supabase
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
    .select('id')
    .single()

  if (empresaError || !novaEmpresa) {
    // Rollback: remove o usuário criado para não deixar órfão
    await supabase.auth.admin.deleteUser(userId)

    if (empresaError?.message?.includes('unique') && empresaError.message?.includes('cnpj')) {
      // CNPJ global já existe: no contexto de convite, orientar a logar e aceitar pela tela própria.
      return NextResponse.json(
        { error: 'Este CNPJ já está cadastrado. Faça login e aceite o convite em "Convites".' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: empresaError?.message ?? 'Erro ao criar empresa.' }, { status: 400 })
  }

  // 3. Se veio de um convite, ancora a solicitação (origem='posto'). Não-fatal:
  //    a empresa já foi criada; em falha, o convite fica para aceite manual em /empresa/convites.
  let conviteAceito = false
  if (conviteToken) {
    try {
      const { data: convite } = await (supabase as any)
        .from('convites')
        .select('id, status, expira_em')
        .eq('token', conviteToken)
        .maybeSingle()
      const c = convite as { id: string; status: string; expira_em: string | null } | null
      const expirado = c?.expira_em ? new Date(c.expira_em) < new Date() : false
      if (c && c.status === 'pendente' && !expirado) {
        const { error: rpcErr } = await (supabase as any).rpc('aceitar_convite', {
          p_convite_id: c.id,
          p_empresa_id: novaEmpresa.id,
        })
        conviteAceito = !rpcErr
        if (rpcErr) console.error('[cadastro/empresa] aceitar_convite falhou:', rpcErr)
      }
    } catch (err) {
      console.error('[cadastro/empresa] erro ao processar convite:', err)
    }
  }

  return NextResponse.json({ userId, email, conviteAceito }, { status: 201 })
}
