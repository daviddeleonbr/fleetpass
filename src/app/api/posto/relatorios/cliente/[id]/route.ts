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

const ymd  = (d: string) => new Date(d).toISOString().slice(0, 10)
const hora = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const brl  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// GET /api/posto/relatorios/cliente/[id] — linha do tempo da empresa parceira
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: empresaId } = await params

    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
    const postoIds = (postos ?? []).map((p: any) => p.id)
    const postoNome: Record<string, string> = Object.fromEntries((postos ?? []).map((p: any) => [p.id, p.nome]))
    if (postoIds.length === 0) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

    // Parceria da empresa com algum posto da conta (ownership)
    const { data: parceria } = await svc
      .from('parcerias')
      .select('id, posto_id, status, iniciada_em, empresas ( nome_empresa, cnpj, cidade, estado )')
      .eq('empresa_id', empresaId)
      .in('posto_id', postoIds)
      .order('iniciada_em', { ascending: false })
      .maybeSingle()
    if (!parceria) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

    const emp = parceria.empresas as { nome_empresa: string; cnpj: string; cidade: string; estado: string } | null

    const eventos: any[] = []

    // 1. Início da parceria
    eventos.push({
      id: `parc-${parceria.id}`, data: ymd(parceria.iniciada_em), hora: hora(parceria.iniciada_em),
      tipo: 'inicio_parceria', titulo: 'Início da parceria',
      descricao: `${emp?.nome_empresa ?? 'Empresa'} tornou-se parceira do ${postoNome[parceria.posto_id] ?? 'posto'}.`,
    })

    // 2. Contrato
    const { data: contrato } = await svc
      .from('contratos')
      .select('assinado_empresa_em, assinado_posto_em, vigencia_inicio')
      .eq('parceria_id', parceria.id)
      .maybeSingle()
    if (contrato?.assinado_posto_em || contrato?.assinado_empresa_em) {
      const quando = contrato.assinado_posto_em ?? contrato.assinado_empresa_em
      eventos.push({
        id: `contr-${parceria.id}`, data: ymd(quando), hora: hora(quando),
        tipo: 'contrato', titulo: 'Contrato assinado',
        descricao: 'Contrato de abastecimento B2B formalizado entre as partes.',
      })
    }

    // 3. Abastecimentos da empresa neste posto
    const { data: abast } = await svc
      .from('abastecimentos')
      .select('id, codigo, data, combustivel, litros, valor, motoristas ( nome ), veiculos ( placa )')
      .eq('empresa_id', empresaId)
      .in('posto_id', postoIds)
      .order('data', { ascending: true })
      .limit(500)
    ;(abast ?? []).forEach((a: any) => {
      const mot = (a.motoristas as { nome: string } | null)?.nome ?? '—'
      const vei = (a.veiculos as { placa: string } | null)?.placa ?? '—'
      eventos.push({
        id: `ab-${a.id}`, data: ymd(a.data), hora: hora(a.data),
        tipo: 'abastecimento', titulo: `Abastecimento ${a.codigo}`,
        descricao: `${mot} abasteceu o veículo ${vei}.`,
        detalhes: {
          'Requisição': a.codigo, 'Motorista': mot, 'Veículo': vei,
          'Combustível': a.combustivel, 'Volume': `${Number(a.litros).toFixed(1)} L`,
          'Valor cobrado': brl(Number(a.valor)),
        },
      })
    })

    // 4. Faturamentos fechados
    const { data: faturas } = await svc
      .from('faturamentos')
      .select('numero, data_faturamento, periodo_inicio, periodo_fim, total_abastecimentos, total_valor, status')
      .eq('empresa_id', empresaId)
      .in('posto_id', postoIds)
      .neq('status', 'pendente')
      .order('data_faturamento', { ascending: true })
    ;(faturas ?? []).forEach((f: any) => {
      eventos.push({
        id: `fat-${f.numero}`, data: ymd(f.data_faturamento),
        tipo: 'faturamento_fechado', titulo: `Fatura ${f.numero} fechada`,
        descricao: 'Fatura do ciclo enviada à empresa.',
        detalhes: {
          'Período': `${ymd(f.periodo_inicio)} a ${ymd(f.periodo_fim)}`,
          'Abastecimentos': String(f.total_abastecimentos),
          'Valor total': brl(Number(f.total_valor)),
        },
      })
    })

    return NextResponse.json({
      cliente: {
        id:      empresaId,
        empresa: emp?.nome_empresa ?? '—',
        cnpj:    emp?.cnpj ?? '—',
        cidade:  emp ? `${emp.cidade}, ${emp.estado}` : '—',
        posto:   postoNome[parceria.posto_id] ?? '—',
        desde:   new Date(parceria.iniciada_em).toLocaleDateString('pt-BR'),
        status:  parceria.status === 'ativa' ? 'ativo' : 'bloqueado',
        eventos,
      },
    })
  } catch (err) {
    console.error('[posto/relatorios/cliente/[id]]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
