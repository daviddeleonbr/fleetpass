import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function getCycleStart(cicloTipo: string): string {
  const now = new Date()
  let start: Date
  switch (cicloTipo) {
    case 'quinzenal':
      start = now.getDate() <= 15
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 16)
      break
    case 'semanal': {
      const d = new Date(now)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
      d.setHours(0, 0, 0, 0)
      start = d
      break
    }
    case 'diario': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      start = d
      break
    }
    default: // mensal
      start = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return start.toISOString()
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    // Get conta_posto for this user
    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()

    if (!conta) return NextResponse.json({ parcerias: [] })

    // Get postos for this conta
    const { data: postos } = await svc
      .from('postos')
      .select('id, nome')
      .eq('conta_posto_id', conta.id)

    if (!postos?.length) return NextResponse.json({ parcerias: [] })

    const postoIds = postos.map((p) => p.id)
    const postoMap = Object.fromEntries(postos.map((p) => [p.id, p.nome]))

    // Parcerias ativas/suspensas e pendentes de assinatura — em paralelo
    const [
      { data: parcerias, error },
      { data: pendAssRaw },
    ] = await Promise.all([
      svc.from('parcerias').select(`
        id, posto_id, empresa_id, status, iniciada_em,
        combustiveis, ciclo_tipo, ciclo_prazo_recebimento, limite_credito,
        empresas ( nome_empresa, cnpj, cidade, estado )
      `).in('posto_id', postoIds).in('status', ['ativa', 'suspensa']).order('iniciada_em', { ascending: false }),
      svc.from('parcerias').select(`
        id, posto_id, empresa_id, iniciada_em, combustiveis,
        empresas(nome_empresa, cnpj, cidade, estado),
        contratos(assinado_empresa_em, assinado_posto_em)
      `).in('posto_id', postoIds)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('status', 'pendente_assinatura' as any).order('iniciada_em', { ascending: false }),
    ])
    if (error) throw error

    const parceriaList = parcerias ?? []
    const parceriaIds = parceriaList.map((p) => p.id)
    const cycleStartById: Record<string, string> = Object.fromEntries(
      parceriaList.map((p) => [p.id, getCycleStart(p.ciclo_tipo)]),
    )

    // UMA query de abastecimentos para todas as parcerias (antes: 1 por parceria = N+1),
    // limitada ao início de ciclo mais antigo; o corte por ciclo de cada parceria é em memória.
    const creditoPorParceria: Record<string, number> = {}
    if (parceriaIds.length) {
      const earliest = Object.values(cycleStartById).reduce((a, b) => (a < b ? a : b))
      const { data: abast } = await svc
        .from('abastecimentos')
        .select('parceria_id, valor, data')
        .in('parceria_id', parceriaIds)
        .gte('data', earliest)
      for (const a of (abast ?? []) as Array<{ parceria_id: string; valor: number; data: string }>) {
        const cs = cycleStartById[a.parceria_id]
        if (cs && new Date(a.data).getTime() >= new Date(cs).getTime()) {
          creditoPorParceria[a.parceria_id] = (creditoPorParceria[a.parceria_id] ?? 0) + (Number(a.valor) || 0)
        }
      }
    }

    const enriched = parceriaList.map((pa) => {
      const combustiveis: string[] = Array.isArray(pa.combustiveis)
        ? (pa.combustiveis as Array<{ tipo?: string; ativo?: boolean }>)
            .filter((c) => c.ativo !== false).map((c) => c.tipo ?? '').filter(Boolean)
        : []
      const empresa = pa.empresas as { nome_empresa: string; cnpj: string; cidade: string; estado: string } | null
      return {
        id: pa.id,
        posto: postoMap[pa.posto_id] ?? '',
        postoId: pa.posto_id,
        empresa: empresa?.nome_empresa ?? '',
        cnpj: empresa?.cnpj ?? '',
        cidade: empresa ? `${empresa.cidade}, ${empresa.estado}` : '',
        desde: new Date(pa.iniciada_em).toLocaleDateString('pt-BR'),
        combustiveis,
        limiteValor: pa.limite_credito != null ? Number(pa.limite_credito) : null,
        creditoUsado: creditoPorParceria[pa.id] ?? 0,
        ciclo: `${capitalCiclo(pa.ciclo_tipo)} · +${pa.ciclo_prazo_recebimento}d`,
        status: pa.status,
        bloqueadoManual: pa.status === 'suspensa',
      }
    })

    const pendentesAssinatura = (pendAssRaw ?? []).map((pa) => {
      const empresa = pa.empresas as { nome_empresa: string; cnpj: string; cidade: string; estado: string } | null
      const contratoRaw = pa.contratos as unknown as { assinado_empresa_em: string | null; assinado_posto_em: string | null } | null
      const combustiveis: string[] = Array.isArray(pa.combustiveis)
        ? (pa.combustiveis as Array<{ tipo?: string; ativo?: boolean }>)
            .filter((c) => c.ativo !== false).map((c) => c.tipo ?? '').filter(Boolean)
        : []
      return {
        id: pa.id,
        posto: postoMap[pa.posto_id] ?? '',
        postoId: pa.posto_id,
        empresa: empresa?.nome_empresa ?? '',
        cnpj: empresa?.cnpj ?? '',
        cidade: empresa ? `${empresa.cidade}, ${empresa.estado}` : '',
        desde: new Date(pa.iniciada_em).toLocaleDateString('pt-BR'),
        combustiveis,
        assinadoEmpresaEm: contratoRaw?.assinado_empresa_em ?? null,
        assinadoPostoEm: contratoRaw?.assinado_posto_em ?? null,
      }
    })

    return NextResponse.json({ parcerias: enriched, pendentesAssinatura })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function capitalCiclo(tipo: string) {
  const map: Record<string, string> = {
    mensal: 'Mensal', quinzenal: 'Quinzenal', semanal: 'Semanal', diario: 'Diário',
  }
  return map[tipo] ?? tipo
}
