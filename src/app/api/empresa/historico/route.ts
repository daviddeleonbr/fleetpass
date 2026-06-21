import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/empresa/historico?ano=2025&mes=3&postoId=...&veiculoId=...&motoristaId=...
export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const sp        = req.nextUrl.searchParams
    const ano       = parseInt(sp.get('ano')  ?? String(new Date().getFullYear()))
    const mes       = parseInt(sp.get('mes')  ?? String(new Date().getMonth() + 1))
    const postoId   = sp.get('postoId')   ?? null
    const veiculoId = sp.get('veiculoId') ?? null
    const motoristaId = sp.get('motoristaId') ?? null

    const inicio = new Date(ano, mes - 1, 1).toISOString()
    const fim    = new Date(ano, mes, 1).toISOString()         // início do mês seguinte

    const svcAny = svc as any

    let query = svcAny
      .from('abastecimentos')
      .select('id, codigo, data, combustivel, litros, valor, veiculos(id, placa, modelo), motoristas(id, nome), postos(id, nome)')
      .eq('empresa_id', empresa.id)
      .gte('data', inicio)
      .lt('data', fim)
      .order('data', { ascending: false })

    if (postoId)    query = query.eq('posto_id',    postoId)
    if (veiculoId)  query = query.eq('veiculo_id',  veiculoId)
    if (motoristaId) query = query.eq('motorista_id', motoristaId)

    const { data, error } = await query
    if (error) throw error

    const abastecimentos = (data ?? []).map((a: any) => {
      const v = a.veiculos   as { id: string; placa: string; modelo: string } | null
      const m = a.motoristas as { id: string; nome: string } | null
      const p = a.postos     as { id: string; nome: string } | null
      return {
        id:          a.id,
        codigo:      a.codigo,
        data:        new Date(a.data).toLocaleDateString('pt-BR'),
        veiculo:     v ? `${v.placa} · ${v.modelo}` : '—',
        veiculoId:   v?.id ?? null,
        veiculoPlaca: v?.placa ?? '—',
        motorista:   m?.nome ?? '—',
        motoristaId: m?.id ?? null,
        posto:       p?.nome ?? '—',
        postoId:     p?.id ?? null,
        combustivel: a.combustivel,
        litros:      Number(a.litros),
        valor:       Number(a.valor),
      }
    })

    // Totais do período (após filtros)
    const totalValor         = abastecimentos.reduce((s: number, a: any) => s + a.valor, 0)
    const totalAbastecimentos = abastecimentos.length
    const postosUnicos       = new Set(abastecimentos.map((a: any) => a.postoId).filter(Boolean)).size

    // Opções de filtro disponíveis no período (sem aplicar filtros de posto/veiculo/motorista)
    // para popular os <select> — buscamos todos do mês sem filtros extras
    const { data: todos } = await svcAny
      .from('abastecimentos')
      .select('veiculos(id, placa, modelo), motoristas(id, nome), postos(id, nome)')
      .eq('empresa_id', empresa.id)
      .gte('data', inicio)
      .lt('data', fim)

    const postoMap    = new Map<string, string>()
    const veiculoMap  = new Map<string, string>()
    const motoristaMap = new Map<string, string>()

    for (const a of (todos ?? [])) {
      const v = a.veiculos   as { id: string; placa: string; modelo: string } | null
      const m = a.motoristas as { id: string; nome: string } | null
      const p = a.postos     as { id: string; nome: string } | null
      if (p) postoMap.set(p.id, p.nome)
      if (v) veiculoMap.set(v.id, `${v.placa} · ${v.modelo}`)
      if (m) motoristaMap.set(m.id, m.nome)
    }

    const opcoes = {
      postos:    [...postoMap.entries()].map(([id, nome]) => ({ id, nome })),
      veiculos:  [...veiculoMap.entries()].map(([id, nome]) => ({ id, nome })),
      motoristas: [...motoristaMap.entries()].map(([id, nome]) => ({ id, nome })),
    }

    return NextResponse.json({
      abastecimentos,
      totais: { valor: totalValor, registros: totalAbastecimentos, postos: postosUnicos },
      opcoes,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
