import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST — envia proposta para uma solicitação.
 * - Se é a primeira proposta: cria v1 e solicitação passa a 'proposta_recebida'.
 * - Se já existe proposta pendente: marca anterior como 'substituida', cria nova versão,
 *   solicitação vai para 'em_negociacao' e registra evento no chat.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: solicitacaoId } = await params

    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: solicitacao } = await svc.from('solicitacoes')
      .select('id, empresa_id, posto_id, status')
      .eq('id', solicitacaoId)
      .single()
    if (!solicitacao) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })

    // Permite envio quando aguardando (v1), com proposta enviada, ou em negociação (v2+)
    const statusValidos = ['aguardando', 'proposta_recebida', 'em_negociacao']
    if (!statusValidos.includes(solicitacao.status)) {
      return NextResponse.json({ error: `Solicitação já foi ${solicitacao.status}.` }, { status: 409 })
    }

    const { data: posto } = await svc.from('postos').select('id').eq('id', solicitacao.posto_id).eq('conta_posto_id', conta.id).single()
    if (!posto) return NextResponse.json({ error: 'Sem permissão para esta solicitação.' }, { status: 403 })

    const body = await req.json()
    const { combustiveis, ciclo, limiteCredito, volumeMinimo, validade, observacoes, comentario, exigeCertificado } = body

    const validadeDias = parseInt(String(validade).replace(/\D/g, '')) || 15

    // Descobre versão e marca anteriores pendentes como substituídas
    const { data: anteriores } = await svc
      .from('propostas')
      .select('id, versao, status')
      .eq('solicitacao_id', solicitacaoId)
      .order('versao', { ascending: false })

    const anterioresList = (anteriores ?? []) as unknown as Array<{ id: string; versao: number; status: string }>
    const proximaVersao = (anterioresList[0]?.versao ?? 0) + 1
    const ehRevisao = anterioresList.some(p => p.status === 'pendente')

    if (ehRevisao) {
      const ids = anterioresList.filter(p => p.status === 'pendente').map(p => p.id)
      if (ids.length > 0) {
        await svc
          .from('propostas')
          .update({ status: 'substituida' as any, updated_at: new Date().toISOString() })
          .in('id', ids)
      }
    }

    const validadeAte = new Date()
    validadeAte.setDate(validadeAte.getDate() + validadeDias)

    const { data: proposta, error: propostaError } = await (svc as any).from('propostas').insert({
      solicitacao_id:          solicitacaoId,
      posto_id:                solicitacao.posto_id,
      empresa_id:              solicitacao.empresa_id,
      combustiveis:            combustiveis ?? [],
      ciclo_tipo:              ciclo.tipo,
      ciclo_intervalo_dias:    ciclo.intervaloDias ? parseInt(ciclo.intervaloDias) : null,
      ciclo_prazo_recebimento: parseInt(ciclo.prazoRecebimento) || 5,
      limite_credito:          limiteCredito ? parseFloat(limiteCredito) : null,
      volume_minimo:           volumeMinimo ? parseFloat(volumeMinimo) : null,
      validade_dias:           validadeDias,
      validade_ate:            validadeAte.toISOString(),
      observacoes:             observacoes || null,
      status:                  'pendente',
      versao:                  proximaVersao,
      exige_certificado:       !!exigeCertificado,
    }).select().single()

    if (propostaError) throw propostaError

    // Atualiza status da solicitação
    const novoStatus = ehRevisao ? 'em_negociacao' : 'proposta_recebida'
    await (svc as any).from('solicitacoes').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', solicitacaoId)

    // Registra evento no chat
    await (svc as any).from('parceria_mensagens').insert({
      solicitacao_id: solicitacaoId,
      autor_tipo: 'posto',
      autor_id: solicitacao.posto_id,
      tipo: ehRevisao ? 'proposta_revisada' : 'proposta_enviada',
      conteudo: comentario?.trim() || null,
      proposta_id: proposta.id,
    })

    // Notifica a empresa
    try {
      const { criarNotificacao, perfilDaEmpresa } = await import('@/lib/notificacoes')
      const destino = await perfilDaEmpresa(svc, solicitacao.empresa_id)
      if (destino) {
        const { data: postoRow } = await svc.from('postos').select('nome').eq('id', solicitacao.posto_id).maybeSingle()
        const postoNome = (postoRow as any)?.nome ?? 'Um posto'
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: ehRevisao ? 'proposta_revisada' : 'proposta_recebida',
          titulo: ehRevisao ? 'Proposta revisada' : 'Nova proposta recebida',
          descricao: ehRevisao
            ? `${postoNome} enviou uma nova versão (v${proximaVersao}) da proposta.`
            : `${postoNome} enviou uma proposta comercial para sua solicitação.`,
          link: '/empresa/parcerias',
        })
      }
    } catch {}

    return NextResponse.json({ proposta, versao: proximaVersao }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
