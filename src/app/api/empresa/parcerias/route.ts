import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // As 4 leituras são independentes → em paralelo (antes: 4 round-trips seriais)
    const [
      { data: ativasRaw },
      { data: pendAssinRaw },
      { data: encerradasRaw },
      { data: solsRaw },
    ] = await Promise.all([
      svc.from('parcerias')
        .select('id, combustiveis, ciclo_tipo, iniciada_em, postos(id, nome, bandeira, cidade, estado)')
        .eq('empresa_id', empresa.id).eq('status', 'ativa').order('iniciada_em', { ascending: false }),
      svc.from('parcerias').select(`
        id, combustiveis, iniciada_em,
        postos(id, nome, bandeira, cidade, estado),
        contratos(assinado_empresa_em, assinado_posto_em)
      `).eq('empresa_id', empresa.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('status', 'pendente_assinatura' as any).order('iniciada_em', { ascending: false }),
      svc.from('parcerias')
        .select('id, combustiveis, encerrada_em, postos(nome, bandeira, cidade, estado)')
        .eq('empresa_id', empresa.id).eq('status', 'encerrada').order('encerrada_em', { ascending: false }),
      svc.from('solicitacoes').select(`
        id, combustiveis, status, created_at,
        postos(id, nome, bandeira, cidade, estado),
        propostas(id, combustiveis, ciclo_tipo, ciclo_intervalo_dias, ciclo_prazo_recebimento,
          limite_credito, volume_minimo, validade_dias, validade_ate, observacoes, status, created_at)
      `).eq('empresa_id', empresa.id)
        .in('status', ['aguardando', 'proposta_recebida', 'em_negociacao'])
        .order('created_at', { ascending: false }),
    ])

    const ativas = (ativasRaw ?? []).map((p) => {
      const posto = p.postos as { id: string; nome: string; bandeira: string; cidade: string; estado: string } | null
      return {
        id: p.id,
        posto_id: posto?.id,
        posto: posto?.nome ?? '—',
        cidade: posto ? `${posto.cidade}, ${posto.estado}` : '—',
        bandeira: posto?.bandeira ?? '—',
        desde: new Date(p.iniciada_em).toLocaleDateString('pt-BR'),
        combustiveis: (p.combustiveis as { tipo: string; ativo?: boolean }[]).filter((c) => c.ativo !== false).map((c) => c.tipo),
      }
    })

    const aguardandoAssinatura = (pendAssinRaw ?? []).map((p) => {
      const posto = p.postos as { id: string; nome: string; bandeira: string; cidade: string; estado: string } | null
      const contratoRaw = p.contratos as unknown as { assinado_empresa_em: string | null; assinado_posto_em: string | null } | null
      return {
        id: p.id,
        posto_id: posto?.id,
        posto: posto?.nome ?? '—',
        cidade: posto ? `${posto.cidade}, ${posto.estado}` : '—',
        bandeira: posto?.bandeira ?? '—',
        desde: new Date(p.iniciada_em).toLocaleDateString('pt-BR'),
        combustiveis: (p.combustiveis as { tipo: string; ativo?: boolean }[]).filter((c) => c.ativo !== false).map((c) => c.tipo),
        assinadoEmpresaEm: contratoRaw?.assinado_empresa_em ?? null,
        assinadoPostoEm: contratoRaw?.assinado_posto_em ?? null,
      }
    })

    const encerradas = (encerradasRaw ?? []).map((p) => {
      const posto = p.postos as { nome: string; bandeira: string; cidade: string; estado: string } | null
      return {
        id: p.id,
        posto: posto?.nome ?? '—',
        cidade: posto ? `${posto.cidade}, ${posto.estado}` : '—',
        encerradoEm: p.encerrada_em ? new Date(p.encerrada_em).toLocaleDateString('pt-BR') : '—',
        combustiveis: (p.combustiveis as { tipo: string }[]).map((c) => c.tipo),
        motivo: 'Encerrado',
      }
    })

    const solsPendentes = solsRaw ?? []

    // Contador de mensagens do posto não lidas pela empresa
    const msgCounts: Record<string, number> = {}
    if (solsPendentes.length > 0) {
      const { data: msgs } = await (svc as any)
        .from('parceria_mensagens')
        .select('solicitacao_id')
        .in('solicitacao_id', solsPendentes.map(s => s.id))
        .eq('autor_tipo', 'posto')
        .is('lida_em', null)
      ;((msgs ?? []) as Array<{ solicitacao_id: string }>).forEach(m => {
        msgCounts[m.solicitacao_id] = (msgCounts[m.solicitacao_id] ?? 0) + 1
      })
    }

    const pendentes = solsPendentes.map((s) => {
      const posto = s.postos as { id: string; nome: string; bandeira: string; cidade: string; estado: string } | null
      const propostas = (s.propostas as Record<string, unknown>[]) ?? []
      // Prefere a proposta vigente (pendente); se não houver, a mais recente
      const proposta = propostas.find((p) => p.status === 'pendente') ?? propostas[0]
      const totalVersoes = propostas.length
      return {
        id: s.id,
        posto_id: posto?.id,
        posto: posto?.nome ?? '—',
        cidade: posto ? `${posto.cidade}, ${posto.estado}` : '—',
        bandeira: posto?.bandeira ?? '—',
        enviadoEm: new Date(s.created_at).toLocaleDateString('pt-BR'),
        combustiveis: s.combustiveis as string[],
        status: s.status,
        mensagensNaoLidas: msgCounts[s.id] ?? 0,
        emNegociacao: s.status === 'em_negociacao',
        totalVersoes,
        proposta: proposta ? {
          id: proposta.id,
          combustiveis: proposta.combustiveis,
          ciclo: {
            tipo: proposta.ciclo_tipo,
            intervaloDias: String(proposta.ciclo_intervalo_dias ?? ''),
            prazoRecebimento: String(proposta.ciclo_prazo_recebimento ?? 5),
          },
          limiteCredito: proposta.limite_credito ? String(proposta.limite_credito) : '',
          volumeMinimo: proposta.volume_minimo ? String(proposta.volume_minimo) : '',
          validade: `${proposta.validade_dias} dias`,
          observacoes: proposta.observacoes ?? '',
          enviadoEm: new Date(proposta.created_at as string).toLocaleDateString('pt-BR'),
          versao: (proposta as any).versao ?? 1,
        } : undefined,
      }
    })

    return NextResponse.json({ ativas, aguardandoAssinatura, pendentes, encerradas })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
