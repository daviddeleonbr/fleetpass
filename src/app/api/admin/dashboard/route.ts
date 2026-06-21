import { NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET /api/admin/dashboard — KPIs e dados reais da plataforma
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any

  try {
    const taxaPct = Number(process.env.FUELLINK_TAXA_SPLIT ?? '2.5')
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    const count = async (tabela: string, build?: (q: any) => any) => {
      let q = svc.from(tabela).select('id', { count: 'exact', head: true })
      if (build) q = build(q)
      const { count } = await q
      return count ?? 0
    }

    const [
      totalPostos, totalEmpresas, requisicoesMes, subcontas, faturas,
      { data: abastMes }, { data: recentes }, { data: postosDatas },
    ] = await Promise.all([
      count('postos'),
      count('empresas'),
      count('requisicoes', (q: any) => q.gte('created_at', inicioMes)),
      count('postos', (q: any) => q.not('asaas_id', 'is', null)),
      count('faturamentos'),
      svc.from('abastecimentos').select('combustivel, litros, valor').gte('data', inicioMes),
      svc.from('abastecimentos')
        .select('id, codigo, data, valor, status, postos(nome), empresas(nome_empresa)')
        .order('data', { ascending: false }).limit(10),
      svc.from('postos').select('created_at').order('created_at', { ascending: true }),
    ])

    // GMV / volume / receita do mês
    const gmvMes = (abastMes ?? []).reduce((s: number, r: any) => s + Number(r.valor), 0)
    const volumeMes = (abastMes ?? []).reduce((s: number, r: any) => s + Number(r.litros), 0)
    const receitaMes = Math.round(gmvMes * (taxaPct / 100) * 100) / 100

    // Volume por combustível (% do mês)
    const porComb = new Map<string, number>()
    for (const r of abastMes ?? []) porComb.set(r.combustivel, (porComb.get(r.combustivel) ?? 0) + Number(r.litros))
    const volumeCombustivel = [...porComb.entries()]
      .map(([tipo, litros]) => ({ tipo, percentual: volumeMes ? Math.round((litros / volumeMes) * 100) : 0 }))
      .sort((a, b) => b.percentual - a.percentual)

    // Crescimento de postos (acumulado nos últimos 6 meses)
    const meses: { mes: string; valor: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 1)
      const acumulado = (postosDatas ?? []).filter((p: any) => new Date(p.created_at) < fim).length
      meses.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valor: acumulado })
    }

    const recentTxs = (recentes ?? []).map((t: any) => ({
      id:      t.codigo ?? t.id,
      empresa: t.empresas?.nome_empresa ?? '—',
      posto:   t.postos?.nome ?? '—',
      valor:   Number(t.valor),
      data:    new Date(t.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      status:  t.status,
    }))

    return NextResponse.json({
      kpis: {
        totalPostos, totalEmpresas, requisicoesMes, volumeMes,
        gmvMes, receitaMes, faturas, subcontas, taxaPct,
      },
      volumeCombustivel,
      crescimentoPostos: meses,
      recentTxs,
      postosSemSubconta: totalPostos - subcontas,
    })
  } catch (err) {
    console.error('[admin/dashboard]', err)
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
