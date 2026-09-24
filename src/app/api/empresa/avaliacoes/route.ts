import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

/**
 * POST /api/empresa/avaliacoes — a empresa avalia um posto parceiro.
 *
 * A tabela `avaliacoes` existia no schema desde o início mas não era lida nem
 * escrita por nenhuma rota; esta é a primeira. Há UNIQUE (posto_id, empresa_id),
 * então reenviar substitui a própria avaliação em vez de duplicar.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — exige perfis.role = 'empresa' → 403.
 *  3. Anti-IDOR     — só aceita postoId com quem ESTA empresa tem/teve parceria;
 *                     a checagem é uma query filtrada por empresa_id, não em memória.
 *  4. Tenant        — empresa_id vem do usuário autenticado, nunca do body.
 *  5. Service client— createServiceClient() só depois de 1–3.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — só nota e comentário são lidos do body; empresa_id e
 *                     util_count são definidos/ignorados no servidor.
 */

/** Parceria precisa ter saído do papel — pendente_assinatura nunca operou. */
const PERMITE_AVALIAR = ['ativa', 'suspensa', 'encerrada'] as const

const COMENTARIO_MAX = 500

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

    // 7. Apenas estes três campos são lidos do body.
    const body = await req.json() as { postoId?: unknown; nota?: unknown; comentario?: unknown }

    const postoId = typeof body.postoId === 'string' ? body.postoId : ''
    if (!postoId) return NextResponse.json({ error: 'Posto não informado.' }, { status: 422 })

    const nota = Number(body.nota)
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return NextResponse.json({ error: 'A nota deve ser um número inteiro de 1 a 5.' }, { status: 422 })
    }

    let comentario: string | null = null
    if (typeof body.comentario === 'string' && body.comentario.trim()) {
      comentario = body.comentario.trim().slice(0, COMENTARIO_MAX)
    }

    // 3. Só avalia quem foi parceiro de verdade — filtro dentro da query.
    const { data: parceria } = await svc
      .from('parcerias')
      .select('id')
      .eq('empresa_id', empresa.id)
      .eq('posto_id', postoId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in('status', PERMITE_AVALIAR as unknown as any[])
      .limit(1)
      .maybeSingle()

    if (!parceria) {
      return NextResponse.json(
        { error: 'Você só pode avaliar postos com quem tem ou teve parceria.' },
        { status: 403 },
      )
    }

    // UNIQUE (posto_id, empresa_id) → upsert substitui a própria avaliação.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: errUpsert } = await (svc as any)
      .from('avaliacoes')
      .upsert(
        { posto_id: postoId, empresa_id: empresa.id, nota, comentario },
        { onConflict: 'posto_id,empresa_id' },
      )

    if (errUpsert) throw errUpsert

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[avaliacoes POST]', err)
    return NextResponse.json({ error: 'Não foi possível salvar a avaliação.' }, { status: 500 })
  }
}
