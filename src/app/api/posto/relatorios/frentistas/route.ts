import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

    const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
    if (!postos?.length) return NextResponse.json({ liberacoes: [], frentistas: [], postos: [] })

    const postoIds = postos.map(p => p.id)

    // Query params
    const url = new URL(req.url)
    const inicio = url.searchParams.get('inicio')
    const fim = url.searchParams.get('fim')
    const postoId = url.searchParams.get('posto')
    const frentistaId = url.searchParams.get('frentista')

    // Busca frentistas dos postos
    const { data: frentistas } = await svc
      .from('frentistas')
      .select('id, nome, posto_id')
      .in('posto_id', postoIds)
      .order('nome')

    // Busca validações — filtra por tenant NO BANCO via requisicoes!inner
    // (antes trazia TODAS as validações da plataforma e filtrava em memória).
    let query = svc
      .from('validacoes')
      .select(`
        id, data_hora, litros, valor_cobrado, valor_unitario, observacao,
        frentista_id,
        frentistas ( id, nome ),
        requisicoes!inner (
          id, codigo, combustivel, posto_id,
          empresas ( nome_empresa ),
          motoristas ( nome ),
          veiculos ( placa, modelo ),
          postos ( id, nome )
        )
      `)
      .in('requisicoes.posto_id', postoIds)
      .order('data_hora', { ascending: false })
      .limit(1000)

    if (inicio) query = query.gte('data_hora', `${inicio}T00:00:00`)
    if (fim) query = query.lte('data_hora', `${fim}T23:59:59`)
    if (frentistaId && frentistaId !== 'todos') query = query.eq('frentista_id', frentistaId)
    if (postoId && postoId !== 'todos') query = query.eq('requisicoes.posto_id', postoId)

    const { data: validacoes, error: valError } = await query

    if (valError) throw valError

    const liberacoes = (validacoes ?? [])
      .map(v => {
        const req = v.requisicoes as any
        const frentista = v.frentistas as any
        return {
          id: v.id,
          dataHora: v.data_hora,
          frentista: frentista?.nome ?? 'Não identificado',
          frentistaId: v.frentista_id,
          empresa: req?.empresas?.nome_empresa ?? '—',
          placa: req?.veiculos?.placa ?? '—',
          veiculo: req?.veiculos?.modelo ?? '',
          motorista: req?.motoristas?.nome ?? '—',
          combustivel: req?.combustivel ?? '—',
          litros: Number(v.litros),
          valorUnitario: Number(v.valor_unitario),
          valorTotal: Number(v.valor_cobrado),
          codigo: req?.codigo ?? '—',
          posto: req?.postos?.nome ?? '—',
        }
      })

    return NextResponse.json({
      liberacoes,
      frentistas: (frentistas ?? []).map(f => ({ id: f.id, nome: f.nome, postoId: f.posto_id })),
      postos: postos.map(p => ({ id: p.id, nome: p.nome })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
