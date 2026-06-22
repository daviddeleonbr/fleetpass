import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// GET /api/posto/perfil — dados do responsável, postos vinculados, métricas e atividade
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any

    const { data: perfil } = await svc
      .from('perfis').select('nome, email, telefone, cargo, created_at').eq('id', user.id).single()

    const { data: conta } = await svc
      .from('contas_posto').select('id, plano_id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc
      .from('postos').select('id, nome, cnpj, cidade, estado, status').eq('conta_posto_id', conta.id)
    const postoIds = (postos ?? []).map((p: any) => p.id)

    // Parcerias ativas por posto (para o card) e total
    const { data: parcerias } = postoIds.length
      ? await svc.from('parcerias').select('posto_id, status').in('posto_id', postoIds)
      : { data: [] }
    const parceriasAtivasPorPosto: Record<string, number> = {}
    let totalParceiros = 0
    for (const p of parcerias ?? []) {
      if (p.status === 'ativa') { parceriasAtivasPorPosto[p.posto_id] = (parceriasAtivasPorPosto[p.posto_id] ?? 0) + 1; totalParceiros++ }
    }

    // Métricas
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const count = async (tabela: string, build?: (q: any) => any) => {
      if (!postoIds.length) return 0
      let q = svc.from(tabela).select('id', { count: 'exact', head: true }).in('posto_id', postoIds)
      if (build) q = build(q)
      const { count } = await q
      return count ?? 0
    }
    const [requisicoesMes, faturas] = await Promise.all([
      count('requisicoes', (q: any) => q.gte('created_at', inicioMes)),
      count('faturamentos'),
    ])

    // Atividade recente (últimos abastecimentos)
    const { data: recentes } = postoIds.length
      ? await svc.from('abastecimentos')
          .select('codigo, data, valor, empresas ( nome_empresa )')
          .in('posto_id', postoIds).order('data', { ascending: false }).limit(6)
      : { data: [] }
    const atividade = (recentes ?? []).map((a: any) => ({
      acao:    `Abastecimento ${a.codigo}`,
      detalhe: `${(a.empresas as { nome_empresa: string } | null)?.nome_empresa ?? '—'} · ${brl(Number(a.valor))}`,
      quando:  new Date(a.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    }))

    const membroDesde = perfil?.created_at
      ? new Date(perfil.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : '—'

    return NextResponse.json({
      perfil: {
        nome:        perfil?.nome ?? '—',
        email:       perfil?.email ?? user.email ?? '—',
        telefone:    perfil?.telefone ?? '—',
        cargo:       perfil?.cargo ?? 'Responsável',
        plano:       conta.plano_id ?? '—',
        membroDesde,
        cidade:      (postos ?? [])[0] ? `${(postos as any)[0].cidade}, ${(postos as any)[0].estado}` : '—',
      },
      postos: (postos ?? []).map((p: any) => ({
        nome:      p.nome,
        cnpj:      p.cnpj,
        parceiros: parceriasAtivasPorPosto[p.id] ?? 0,
        status:    p.status,
      })),
      stats: { postos: (postos ?? []).length, parceiros: totalParceiros, requisicoesMes, faturas },
      atividade,
    })
  } catch (err) {
    console.error('[posto/perfil]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
