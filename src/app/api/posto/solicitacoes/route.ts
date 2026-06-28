import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

// POST — o POSTO inicia a solicitação (origem='posto') para uma transportadora
// já cadastrada. Em seguida o posto envia a proposta (fluxo existente).
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const postoId = String(body?.postoId ?? '')
    const empresaId = String(body?.empresaId ?? '')
    if (!postoId || !empresaId) return NextResponse.json({ error: 'postoId e empresaId obrigatórios.' }, { status: 400 })

    // posto pertence à conta (anti-IDOR)
    const { data: posto } = await svc.from('postos').select('id, combustiveis').eq('id', postoId).eq('conta_posto_id', conta.id).maybeSingle()
    if (!posto) return NextResponse.json({ error: 'Posto inválido.' }, { status: 403 })

    // transportadora precisa já estar cadastrada
    const { data: empresa } = await svc.from('empresas').select('id').eq('id', empresaId).maybeSingle()
    if (!empresa) return NextResponse.json({ error: 'Transportadora não encontrada.' }, { status: 404 })

    // Guards: já há vínculo/negociação com esse posto?
    const [{ data: parc }, { data: solAtiva }] = await Promise.all([
      svc.from('parcerias').select('id').eq('posto_id', postoId).eq('empresa_id', empresaId).in('status', ['ativa', 'pendente_assinatura']).maybeSingle(),
      svc.from('solicitacoes').select('id').eq('posto_id', postoId).eq('empresa_id', empresaId).in('status', ['aguardando', 'proposta_recebida', 'em_negociacao']).maybeSingle(),
    ])
    if (parc)     return NextResponse.json({ error: 'Você já tem parceria ativa/pendente com esta transportadora.' }, { status: 409 })
    if (solAtiva) return NextResponse.json({ error: 'Já existe uma negociação em andamento com esta transportadora.' }, { status: 409 })

    // Combustíveis da solicitação = os do posto (para o form de proposta listar);
    // fallback para os padrões quando o posto ainda não definiu nenhum.
    const COMB_PADRAO = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel Comum', 'Diesel S-10']
    const combustiveis = (posto.combustiveis?.length ? posto.combustiveis : COMB_PADRAO)

    const { data: nova, error } = await svc.from('solicitacoes').insert({
      empresa_id:   empresaId,
      posto_id:     postoId,
      combustiveis,
      status:       'aguardando',
      origem:       'posto',
    }).select('id').single()
    if (error) throw error

    return NextResponse.json({ solicitacaoId: nova.id }, { status: 201 })
  } catch (err) {
    console.error('[posto/solicitacoes POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

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
