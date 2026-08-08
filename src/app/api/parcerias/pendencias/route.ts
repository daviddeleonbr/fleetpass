import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * GET — retorna contadores de pendências relacionadas a parcerias do usuário logado.
 * Usado pelo sidebar para exibir indicador visual.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ total: 0 })

    const svc = createServiceClient()

    // Tenta resolver como empresa
    const { data: empresa } = await svc
      .from('empresas')
      .select('id')
      .eq('perfil_id', user.id)
      .maybeSingle()

    if (empresa) {
      // sols (precisa dos ids p/ msgs) e contratos a assinar são independentes → paralelo
      const [{ data: sols }, { data: assinar }] = await Promise.all([
        svc.from('solicitacoes').select('id, status')
          .eq('empresa_id', empresa.id).in('status', ['proposta_recebida', 'em_negociacao']),
        svc.from('parcerias').select('id, contratos!inner(assinado_empresa_em)')
          .eq('empresa_id', empresa.id).eq('status', 'pendente_assinatura').is('contratos.assinado_empresa_em', null),
      ])

      const propostasParaRevisar = sols?.length ?? 0

      let msgsNaoLidas = 0
      if (sols && sols.length > 0) {
        const { count } = await (svc as any)
          .from('parceria_mensagens')
          .select('id', { count: 'exact', head: true })
          .in('solicitacao_id', sols.map((s: { id: string }) => s.id))
          .eq('autor_tipo', 'posto')
          .is('lida_em', null)
        msgsNaoLidas = count ?? 0
      }

      const contratosPend = assinar?.length ?? 0

      return NextResponse.json({
        role: 'empresa',
        propostasParaRevisar,
        msgsNaoLidas,
        contratosPendentes: contratosPend,
        total: propostasParaRevisar + contratosPend,
      })
    }

    // Tenta resolver como posto
    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .maybeSingle()

    if (conta) {
      const { data: postos } = await svc
        .from('postos')
        .select('id')
        .eq('conta_posto_id', conta.id)
      const postoIds = (postos ?? []).map(p => p.id)

      if (postoIds.length === 0) return NextResponse.json({ total: 0 })

      // Contadores independentes em paralelo (novas/negociando via count; sols precisa dos ids)
      const [
        { count: novasCountRaw },
        { count: negociandoCountRaw },
        { data: sols },
        { data: assinar },
      ] = await Promise.all([
        svc.from('solicitacoes').select('id', { count: 'exact', head: true }).in('posto_id', postoIds).eq('status', 'aguardando'),
        svc.from('solicitacoes').select('id', { count: 'exact', head: true }).in('posto_id', postoIds).eq('status', 'em_negociacao'),
        svc.from('solicitacoes').select('id').in('posto_id', postoIds).in('status', ['proposta_recebida', 'em_negociacao']),
        svc.from('parcerias').select('id, contratos!inner(assinado_posto_em)').in('posto_id', postoIds).eq('status', 'pendente_assinatura').is('contratos.assinado_posto_em', null),
      ])

      let msgsNaoLidas = 0
      if (sols && sols.length > 0) {
        const { count } = await (svc as any)
          .from('parceria_mensagens')
          .select('id', { count: 'exact', head: true })
          .in('solicitacao_id', sols.map((s: { id: string }) => s.id))
          .eq('autor_tipo', 'empresa')
          .is('lida_em', null)
        msgsNaoLidas = count ?? 0
      }

      const novasCount      = novasCountRaw ?? 0
      const negociandoCount = negociandoCountRaw ?? 0
      const contratosPend   = assinar?.length ?? 0

      return NextResponse.json({
        role: 'posto',
        novasSolicitacoes: novasCount,
        negociandoCount,
        msgsNaoLidas,
        contratosPendentes: contratosPend,
        total: novasCount + negociandoCount + msgsNaoLidas + contratosPend,
      })
    }

    return NextResponse.json({ total: 0 })
  } catch (err) {
    return NextResponse.json({ total: 0, error: String(err) }, { status: 200 })
  }
}
