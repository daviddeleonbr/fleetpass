import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { maskCpfCnpj } from '@/lib/documento'
import { gerarTokenConvite, enviarEmailConvite } from '@/lib/convites'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

async function postosDaConta(svc: any, userId: string): Promise<{ ids: string[]; nomes: Record<string, string>; lista: { id: string; nome: string; combustiveis: string[] }[] } | null> {
  const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', userId).single()
  if (!conta) return null
  const { data: postos } = await svc.from('postos').select('id, nome, combustiveis').eq('conta_posto_id', conta.id).eq('status', 'ativo')
  const lista: { id: string; nome: string; combustiveis: string[] }[] =
    (postos ?? []).map((p: any) => ({ id: p.id, nome: p.nome, combustiveis: p.combustiveis ?? [] }))
  return {
    ids: lista.map((p) => p.id),
    nomes: Object.fromEntries(lista.map((p) => [p.id, p.nome])),
    lista,
  }
}

// GET /api/posto/convites — lista os convites dos postos da conta
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const postos = await postosDaConta(svc, user.id)
    if (!postos) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })
    if (postos.ids.length === 0) return NextResponse.json({ convites: [], postos: [] })

    const { data: convites } = await svc
      .from('convites')
      .select('id, posto_id, empresa_id, email_destino, cnpj_destino, nome_empresa_sugerido, combustiveis, mensagem, status, expira_em, aceito_em, created_at')
      .in('posto_id', postos.ids)
      .order('created_at', { ascending: false })

    const lista = (convites ?? []).map((c: any) => ({
      ...c,
      posto: postos.nomes[c.posto_id] ?? '—',
      jaCadastrada: !!c.empresa_id,
    }))

    return NextResponse.json({ convites: lista, postos: postos.lista })
  } catch (err) {
    console.error('[posto/convites GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// POST /api/posto/convites — cria um convite e dispara o e-mail
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const postos = await postosDaConta(svc, user.id)
    if (!postos) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const postoId = String(body?.postoId ?? '')
    const email = String(body?.email ?? '').trim()
    const combustiveis: string[] = Array.isArray(body?.combustiveis) ? body.combustiveis : []
    const mensagem = body?.mensagem ? String(body.mensagem) : null
    const nomeEmpresa = body?.nomeEmpresa ? String(body.nomeEmpresa) : null
    const expiraDias = Number(body?.expiraDias) > 0 ? Number(body.expiraDias) : 14

    if (!postoId || !postos.ids.includes(postoId)) {
      return NextResponse.json({ error: 'Selecione um posto válido da sua conta.' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
    }

    // Casa o CNPJ (se informado) com uma empresa global já existente
    const cnpjFormatado = body?.cnpj ? maskCpfCnpj(String(body.cnpj)) : null
    let empresaId: string | null = null
    if (cnpjFormatado) {
      const { data: emp } = await svc.from('empresas').select('id').eq('cnpj', cnpjFormatado).maybeSingle()
      empresaId = (emp as any)?.id ?? null
    }

    const token = gerarTokenConvite()
    const expiraEm = new Date(Date.now() + expiraDias * 86400000).toISOString()

    const { data: convite, error: insErr } = await svc
      .from('convites')
      .insert({
        posto_id:              postoId,
        empresa_id:            empresaId,
        email_destino:         email,
        cnpj_destino:          cnpjFormatado,
        nome_empresa_sugerido: nomeEmpresa,
        combustiveis,
        mensagem,
        token,
        status:                'pendente',
        expira_em:             expiraEm,
      })
      .select('id, token')
      .single()

    if (insErr) {
      if (String(insErr.code) === '23505') {
        return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail neste posto.' }, { status: 409 })
      }
      throw insErr
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const link = `${origin}/convite/${token}`

    // Notifica a empresa (se já cadastrada) e dispara o e-mail
    if (empresaId) {
      try {
        const { criarNotificacao, perfilDaEmpresa } = await import('@/lib/notificacoes')
        const destino = await perfilDaEmpresa(svc, empresaId)
        if (destino) {
          await criarNotificacao(svc, {
            perfilId: destino,
            tipo: 'convite_recebido',
            titulo: 'Você recebeu um convite de posto',
            descricao: `${postos.nomes[postoId] ?? 'Um posto'} convidou sua empresa para uma parceria.`,
            link: '/empresa/convites',
          })
        }
      } catch {}
    }

    const emailEnviado = await enviarEmailConvite({
      to: email,
      postoNome: postos.nomes[postoId] ?? 'Um posto parceiro',
      link,
      mensagem,
    })

    return NextResponse.json({ convite, link, emailEnviado }, { status: 201 })
  } catch (err) {
    console.error('[posto/convites POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
