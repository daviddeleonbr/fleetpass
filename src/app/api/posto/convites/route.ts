import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
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
    const empresaId = String(body?.empresaId ?? '')
    const mensagem = body?.mensagem ? String(body.mensagem) : null
    const expiraDias = Number(body?.expiraDias) > 0 ? Number(body.expiraDias) : 14

    if (!postoId || !postos.ids.includes(postoId)) {
      return NextResponse.json({ error: 'Selecione um posto válido da sua conta.' }, { status: 400 })
    }
    if (!empresaId) {
      return NextResponse.json({ error: 'Selecione a transportadora a convidar.' }, { status: 400 })
    }

    // A transportadora precisa já estar cadastrada (entidade global)
    const { data: empresa } = await svc
      .from('empresas').select('id, nome_empresa, cnpj, perfil_id').eq('id', empresaId).maybeSingle()
    if (!empresa) return NextResponse.json({ error: 'Transportadora não encontrada.' }, { status: 404 })

    const { data: perfilEmp } = await svc.from('perfis').select('email').eq('id', empresa.perfil_id).maybeSingle()
    const email = (perfilEmp as any)?.email ?? ''

    // Guards: evita convidar quem já tem vínculo/negociação com o posto
    const [{ data: parc }, { data: convPend }, { data: sol }] = await Promise.all([
      svc.from('parcerias').select('id').eq('posto_id', postoId).eq('empresa_id', empresaId).in('status', ['ativa', 'pendente_assinatura']).maybeSingle(),
      svc.from('convites').select('id').eq('posto_id', postoId).eq('empresa_id', empresaId).eq('status', 'pendente').maybeSingle(),
      svc.from('solicitacoes').select('id').eq('posto_id', postoId).eq('empresa_id', empresaId).in('status', ['aguardando', 'proposta_recebida']).maybeSingle(),
    ])
    if (parc)     return NextResponse.json({ error: 'Você já tem parceria ativa/pendente com esta transportadora.' }, { status: 409 })
    if (sol)      return NextResponse.json({ error: 'Já existe uma negociação em andamento com esta transportadora.' }, { status: 409 })
    if (convPend) return NextResponse.json({ error: 'Já existe um convite pendente para esta transportadora.' }, { status: 409 })

    const token = gerarTokenConvite()
    const expiraEm = new Date(Date.now() + expiraDias * 86400000).toISOString()

    const { data: convite, error: insErr } = await svc
      .from('convites')
      .insert({
        posto_id:              postoId,
        empresa_id:            empresaId,
        email_destino:         email || `empresa-${empresaId}@sem-email.local`,
        cnpj_destino:          empresa.cnpj,
        nome_empresa_sugerido: empresa.nome_empresa,
        combustiveis:          [],
        mensagem,
        token,
        status:                'pendente',
        expira_em:             expiraEm,
      })
      .select('id, token')
      .single()

    if (insErr) {
      if (String(insErr.code) === '23505') {
        return NextResponse.json({ error: 'Já existe um convite pendente para esta transportadora.' }, { status: 409 })
      }
      throw insErr
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const link = `${origin}/convite/${token}`

    // Notifica a transportadora (in-app) — ela vê em /empresa/convites
    try {
      const { criarNotificacao, perfilDaEmpresa } = await import('@/lib/notificacoes')
      const destino = await perfilDaEmpresa(svc, empresaId)
      if (destino) {
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: 'convite_recebido',
          titulo: 'Você recebeu um convite de posto',
          descricao: `${postos.nomes[postoId] ?? 'Um posto'} convidou sua transportadora para uma parceria.`,
          link: '/empresa/convites',
        })
      }
    } catch {}

    // E-mail é bônus (não-fatal); a transportadora já vê o convite no painel
    const emailEnviado = email
      ? await enviarEmailConvite({ to: email, postoNome: postos.nomes[postoId] ?? 'Um posto parceiro', link, mensagem })
      : false

    return NextResponse.json({ convite, link, emailEnviado, empresaNome: empresa.nome_empresa }, { status: 201 })
  } catch (err) {
    console.error('[posto/convites POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
