import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/empresa/liberacoes
// Retorna parcerias ativas + config de liberação de cada uma + frota da empresa
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // 1. Parcerias ativas com dados do posto
    const { data: parcerias, error: errParc } = await svc
      .from('parcerias')
      .select('id, combustiveis, postos(id, nome, cidade, estado)')
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })

    if (errParc) throw errParc

    if (!parcerias || parcerias.length === 0) {
      return NextResponse.json({ parcerias: [], frota: [] })
    }

    const parceriaIds = parcerias.map(p => p.id)

    // 2. Liberações existentes para essas parcerias
    const { data: libs } = await svc
      .from('liberacoes')
      .select('id, parceria_id, ativa, veiculos_config, usar_limite_por_abast, limite_tipo, limite_por_abast, usar_limite_mensal, limite_mensal')
      .in('parceria_id', parceriaIds)

    // 3. Veículos selecionados nas liberações com config = 'selecionados'
    const libIds = (libs ?? []).filter(l => l.veiculos_config === 'selecionados').map(l => l.id)
    const { data: libVeics } = libIds.length > 0
      ? await svc.from('liberacao_veiculos').select('liberacao_id, veiculo_id').in('liberacao_id', libIds)
      : { data: [] }

    // 4. Frota ativa (para o modal de configuração)
    const { data: frota } = await svc
      .from('veiculos')
      .select('id, placa, modelo, combustivel')
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativo')
      .eq('bloqueado', false)
      .order('placa')

    // Montar resposta
    const libMap = new Map((libs ?? []).map(l => [l.parceria_id, l]))
    const veicMap = new Map<string, string[]>()
    for (const lv of (libVeics ?? [])) {
      const arr = veicMap.get(lv.liberacao_id) ?? []
      arr.push(lv.veiculo_id)
      veicMap.set(lv.liberacao_id, arr)
    }

    const result = (parcerias ?? []).map(p => {
      const posto = p.postos as unknown as { id: string; nome: string; cidade: string; estado: string } | null
      const combustRaw = (p.combustiveis as unknown as { tipo?: string; ativo?: boolean }[] | null) ?? []
      const combustiveis = combustRaw.filter(c => c.ativo !== false).map(c => c.tipo ?? '').filter(Boolean)

      const lib = libMap.get(p.id) ?? null

      return {
        parceriaId:   p.id,
        posto:        posto?.nome ?? 'Posto',
        postoId:      posto?.id ?? '',
        cidade:       posto ? `${posto.cidade}, ${posto.estado}` : '',
        combustiveis,
        liberacao: lib ? {
          id:                 lib.id,
          ativa:              lib.ativa,
          veiculosConfig:     lib.veiculos_config as 'todos' | 'selecionados',
          veiculosIds:        veicMap.get(lib.id) ?? [],
          usarLimitePorAbast: lib.usar_limite_por_abast,
          limiteTipo:         lib.limite_tipo as 'valor' | 'volume' | null,
          limitePorAbast:     lib.limite_por_abast ? Number(lib.limite_por_abast) : null,
          usarLimiteMensal:   lib.usar_limite_mensal,
          limiteMensal:       lib.limite_mensal ? Number(lib.limite_mensal) : null,
        } : null,
      }
    })

    return NextResponse.json({ parcerias: result, frota: frota ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
