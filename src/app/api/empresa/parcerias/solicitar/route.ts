import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'
import { criarNotificacao, perfilDoPosto } from '@/lib/notificacoes'

/**
 * POST /api/empresa/parcerias/solicitar — a transportadora pede parceria a um posto.
 *
 * NÃO cria parceria. Cria uma `solicitacao` com status 'aguardando' e
 * origem='empresa', que cai na aba "Novas" de /posto/parcerias/solicitacoes.
 * O posto continua decidindo: ele responde com uma proposta, a empresa aceita,
 * e só então nasce a parceria. O motor comercial permanece intacto —
 * solicitação → proposta → aceite → parceria.
 *
 * `solicitacoes.origem` já previa 'empresa'; esta rota volta a usá-lo.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — exige perfis.role = 'empresa' → 403.
 *  3. Anti-IDOR     — o postoId do body só resolve para posto ATIVO; empresa_id
 *                     jamais vem do cliente. Duplicidade é checada por query
 *                     filtrada pelos dois lados do par.
 *  4. Tenant        — empresa_id derivado do usuário autenticado.
 *  5. Service client— createServiceClient() só depois de 1–3.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — só postoId e mensagem são lidos do body; status, origem e
 *                     empresa_id são definidos no servidor.
 */

/** Combustíveis padrão quando o posto ainda não definiu os seus. */
const COMB_PADRAO = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel Comum', 'Diesel S-10']

/** Vínculos que impedem uma nova solicitação. */
const PARCERIA_VIGENTE = ['ativa', 'suspensa', 'pendente_assinatura'] as const
const SOLICITACAO_ABERTA = ['aguardando', 'proposta_recebida', 'em_negociacao'] as const

const MENSAGEM_MAX = 500

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
    if ((perfil?.role as string) !== 'empresa') {
      return NextResponse.json({ error: 'Acesso restrito a empresas.' }, { status: 403 })
    }

    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const body = await req.json() as { postoId?: unknown; mensagem?: unknown }

    const postoId = typeof body.postoId === 'string' ? body.postoId : ''
    if (!postoId) return NextResponse.json({ error: 'Posto não informado.' }, { status: 422 })

    let mensagem: string | null = null
    if (typeof body.mensagem === 'string' && body.mensagem.trim()) {
      mensagem = body.mensagem.trim().slice(0, MENSAGEM_MAX)
    }

    const { data: posto } = await svc
      .from('postos')
      .select('id, nome, combustiveis')
      .eq('id', postoId)
      .eq('status', 'ativo')
      .maybeSingle()

    if (!posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    // Evita duplicar vínculo: parceria vigente ou negociação já aberta.
    const [{ data: parceria }, { data: aberta }] = await Promise.all([
      svc.from('parcerias').select('id').eq('empresa_id', empresa.id).eq('posto_id', postoId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in('status', PARCERIA_VIGENTE as unknown as any[]).maybeSingle(),
      svc.from('solicitacoes').select('id').eq('empresa_id', empresa.id).eq('posto_id', postoId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in('status', SOLICITACAO_ABERTA as unknown as any[]).maybeSingle(),
    ])

    if (parceria) {
      return NextResponse.json({ error: 'Você já tem parceria vigente com este posto.' }, { status: 409 })
    }
    if (aberta) {
      return NextResponse.json({ error: 'Já existe uma solicitação em andamento com este posto.' }, { status: 409 })
    }

    const combustiveis = posto.combustiveis?.length ? posto.combustiveis : COMB_PADRAO

    const { data: nova, error: errInsert } = await svc
      .from('solicitacoes')
      .insert({
        empresa_id: empresa.id,
        posto_id:   postoId,
        combustiveis,
        mensagem,
        status:     'aguardando',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        origem:     'empresa' as any,
      })
      .select('id')
      .single()

    if (errInsert) throw errInsert

    // Avisa o posto. Não-fatal: a solicitação já está criada.
    const perfilPosto = await perfilDoPosto(svc, postoId)
    if (perfilPosto) {
      await criarNotificacao(svc, {
        perfilId:  perfilPosto,
        tipo:      'solicitacao_nova',
        titulo:    'Nova solicitação de parceria',
        descricao: `Uma transportadora solicitou parceria com ${posto.nome}.`,
        link:      '/posto/parcerias/solicitacoes',
      })
    }

    return NextResponse.json({ ok: true, solicitacaoId: nova.id }, { status: 201 })
  } catch (err) {
    console.error('[empresa/parcerias/solicitar POST]', err)
    return NextResponse.json({ error: 'Não foi possível enviar a solicitação.' }, { status: 500 })
  }
}
