import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
    const postoIds  = (postos ?? []).map(p => p.id)
    const postoNome: Record<string, string> = Object.fromEntries((postos ?? []).map(p => [p.id, p.nome]))

    if (postoIds.length === 0)
      return NextResponse.json({ novas: [], enviadas: [], aprovadas: [], rejeitadas: [] })

    const { data: sols } = await svc.from('solicitacoes')
      .select(`
        id, posto_id, combustiveis, volume_estimado, valor_estimado, mensagem, status, created_at,
        empresas(id, nome_empresa, cnpj, cidade, estado),
        propostas(
          id, combustiveis, ciclo_tipo, ciclo_intervalo_dias, ciclo_prazo_recebimento,
          limite_credito, volume_minimo, validade_dias, observacoes, status, created_at, updated_at, exige_certificado,
          parcerias(id, status, contratos(assinado_empresa_em, assinado_posto_em))
        )
      `)
      .in('posto_id', postoIds)
      .order('created_at', { ascending: false })

    type EmpresaRow = { id: string; nome_empresa: string; cnpj: string; cidade: string; estado: string }
    type ContratoRow = { assinado_empresa_em: string | null; assinado_posto_em: string | null }
    type ParceriaRow = { id: string; status: string; contratos: ContratoRow[] }
    type PropostaRow = {
      id: string; combustiveis: unknown; ciclo_tipo: string; ciclo_intervalo_dias: number | null
      ciclo_prazo_recebimento: number; limite_credito: number | null; volume_minimo: number | null
      validade_dias: number; observacoes: string | null; status: string
      created_at: string; updated_at: string; parcerias: ParceriaRow[]
    }
    type SolRow = {
      id: string; posto_id: string; combustiveis: string[]; volume_estimado: string | null
      valor_estimado: number | null; mensagem: string | null; status: string; created_at: string
      empresas: EmpresaRow | null; propostas: PropostaRow[]
    }

    const mapBase = (s: SolRow) => {
      const emp = s.empresas
      return {
        id:            s.id,
        posto:         postoNome[s.posto_id] ?? '—',
        empresa:       emp?.nome_empresa ?? '—',
        cnpj:          emp?.cnpj ?? '—',
        cidade:        emp ? `${emp.cidade}, ${emp.estado}` : '—',
        combustiveis:  s.combustiveis ?? [],
        volume:        s.volume_estimado ?? '',
        valorEstimado: s.valor_estimado ? `R$ ${Number(s.valor_estimado).toLocaleString('pt-BR')}/mês` : '',
        mensagem:      s.mensagem ?? '',
        status:        s.status,
        created_at:    s.created_at,
      }
    }

    const novas = (sols as unknown as SolRow[] ?? [])
      .filter(s => s.status === 'aguardando')
      .map(mapBase)

    const solsEnviadas = (sols as unknown as SolRow[] ?? [])
      .filter(s => s.status === 'proposta_recebida' || s.status === 'em_negociacao')

    // Contador de mensagens não lidas enviadas pela empresa em cada solicitação
    const msgCounts: Record<string, number> = {}
    if (solsEnviadas.length > 0) {
      const { data: msgs } = await (svc as any)
        .from('parceria_mensagens')
        .select('solicitacao_id')
        .in('solicitacao_id', solsEnviadas.map(s => s.id))
        .eq('autor_tipo', 'empresa')
        .is('lida_em', null)
      ;((msgs ?? []) as Array<{ solicitacao_id: string }>).forEach(m => {
        msgCounts[m.solicitacao_id] = (msgCounts[m.solicitacao_id] ?? 0) + 1
      })
    }

    const enviadas = solsEnviadas.map(s => {
      // Prefere a proposta pendente (vigente); se não houver, pega a mais recente
      const proposta = s.propostas?.find(p => p.status === 'pendente') ?? s.propostas?.[0]
      const versaoAtual = (proposta as any)?.versao ?? 1
      return {
        ...mapBase(s),
        mensagensNaoLidas: msgCounts[s.id] ?? 0,
        emNegociacao:      s.status === 'em_negociacao',
        versaoAtual,
        proposta: proposta ? {
          id:               proposta.id,
          combustiveis:     proposta.combustiveis,
          ciclo: {
            tipo:             proposta.ciclo_tipo,
            intervaloDias:    String(proposta.ciclo_intervalo_dias ?? ''),
            prazoRecebimento: String(proposta.ciclo_prazo_recebimento ?? 5),
          },
          limiteCredito:    proposta.limite_credito ? String(proposta.limite_credito) : '',
          volumeMinimo:     proposta.volume_minimo  ? String(proposta.volume_minimo)  : '',
          validade:         `${proposta.validade_dias} dias`,
          observacoes:      proposta.observacoes ?? '',
          enviadoEm:        new Date(proposta.created_at).toLocaleDateString('pt-BR'),
          exigeCertificado: (proposta as any).exige_certificado ?? false,
        } : undefined,
      }
    })

    const aprovadas = (sols as unknown as SolRow[] ?? [])
      .filter(s => s.status === 'aceita')
      .map(s => {
        const propostaAceita = s.propostas?.find(p => p.status === 'aceita') ?? s.propostas?.[0]
        const parceria = propostaAceita?.parcerias?.[0] ?? null
        const contrato = parceria?.contratos?.[0] ?? null
        return {
          ...mapBase(s),
          parceriaId:         parceria?.id ?? null,
          parceriaStatus:     parceria?.status ?? null,
          assinadoEmpresaEm:  contrato?.assinado_empresa_em ?? null,
          assinadoPostoEm:    contrato?.assinado_posto_em   ?? null,
          aprovadoEm:         propostaAceita?.updated_at
            ? new Date(propostaAceita.updated_at).toLocaleDateString('pt-BR')
            : new Date(s.created_at).toLocaleDateString('pt-BR'),
        }
      })

    const rejeitadas = (sols as unknown as SolRow[] ?? [])
      .filter(s => s.status === 'rejeitada')
      .map(mapBase)

    return NextResponse.json({ novas, enviadas, aprovadas, rejeitadas })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
