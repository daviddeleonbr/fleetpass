import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    // Busca o frentista logado pelo perfil_id
    const { data: frentista } = await svc
      .from('frentistas')
      .select('id, posto_id')
      .eq('perfil_id', user.id)
      .single()

    if (!frentista) return NextResponse.json({ error: 'Frentista não encontrado.' }, { status: 404 })

    const postoId = frentista.posto_id

    // Todos os frentistas do mesmo posto (para o filtro)
    const { data: frentistas } = await svc
      .from('frentistas')
      .select('id, nome')
      .eq('posto_id', postoId)
      .eq('status', 'ativo')
      .order('nome')

    // Query params
    const url = new URL(req.url)
    const dia = url.searchParams.get('dia') ?? 'hoje'
    const frentistaId = url.searchParams.get('frentista')

    // Calcular datas
    const hoje = new Date()
    const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10)
    const dataAlvo = dia === 'ontem'
      ? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
      : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const dataStr = yyyymmdd(dataAlvo)

    let query = svc
      .from('validacoes')
      .select(`
        id, data_hora, litros, valor_cobrado, frentista_id,
        frentistas ( id, nome ),
        requisicoes (
          id, codigo, combustivel,
          empresas ( nome_empresa ),
          motoristas ( nome ),
          veiculos ( placa, modelo ),
          postos ( id )
        )
      `)
      .gte('data_hora', `${dataStr}T00:00:00`)
      .lte('data_hora', `${dataStr}T23:59:59`)
      .order('data_hora', { ascending: false })

    if (frentistaId && frentistaId !== 'todos') {
      query = query.eq('frentista_id', frentistaId)
    }

    const { data: validacoes, error: valError } = await query
    if (valError) throw valError

    // Filtra apenas validações deste posto
    const liberacoes = (validacoes ?? [])
      .filter(v => {
        const r = v.requisicoes as any
        return r?.postos?.id === postoId
      })
      .map(v => {
        const r = v.requisicoes as any
        const fr = v.frentistas as any
        return {
          id: v.id,
          dataHora: v.data_hora,
          frentista: fr?.nome ?? 'Não identificado',
          frentistaId: v.frentista_id,
          empresa: r?.empresas?.nome_empresa ?? '—',
          placa: r?.veiculos?.placa ?? '—',
          motorista: r?.motoristas?.nome ?? '—',
          combustivel: r?.combustivel ?? '—',
          litros: Number(v.litros),
          valorTotal: Number(v.valor_cobrado),
          codigo: r?.codigo ?? '—',
        }
      })

    return NextResponse.json({
      liberacoes,
      frentistas: (frentistas ?? []).map(f => ({ id: f.id, nome: f.nome })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
