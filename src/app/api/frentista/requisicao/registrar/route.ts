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

/**
 * POST /api/frentista/requisicao/registrar  { reqId, litros, valorUnitario, hodometro? }
 *
 * Passo 6 (após abastecer): o frentista registra litros e valor por litro.
 * Cria o registro em `validacoes` e marca a requisição como 'concluido'.
 * Só funciona para requisições 'ativo' (já liberadas) no posto do frentista.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação — frentista ativo
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: frentista } = await svc
      .from('frentistas')
      .select('id, posto_id, status')
      .eq('perfil_id', user.id)
      .single()
    if (!frentista || frentista.status !== 'ativo') {
      return NextResponse.json({ error: 'Apenas frentistas ativos podem registrar.' }, { status: 403 })
    }

    // 2. Entrada
    const body = await req.json().catch(() => ({}))
    const reqId = String(body?.reqId ?? '')
    const litros = Number(body?.litros)
    const valorUnitario = Number(body?.valorUnitario)
    const hodometro = body?.hodometro != null && body.hodometro !== '' ? Number(body.hodometro) : null
    if (!reqId) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
    if (!Number.isFinite(litros) || litros <= 0) return NextResponse.json({ error: 'Informe os litros abastecidos.' }, { status: 400 })
    if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) return NextResponse.json({ error: 'Informe o valor por litro.' }, { status: 400 })

    const valorCobrado = Math.round(litros * valorUnitario * 100) / 100

    // 3. Requisição NO POSTO do frentista, já liberada ('ativo')
    const { data: r } = await svc
      .from('requisicoes')
      .select('id, status, posto_id, tipo_limite, limite_valor, limite_volume')
      .eq('id', reqId)
      .eq('posto_id', frentista.posto_id)
      .maybeSingle()
    if (!r) return NextResponse.json({ error: 'Requisição não encontrada neste posto.' }, { status: 404 })
    if (r.status === 'concluido') return NextResponse.json({ error: 'Esta requisição já foi registrada.' }, { status: 409 })
    if (r.status !== 'ativo') return NextResponse.json({ error: 'Libere o abastecimento antes de registrar.' }, { status: 409 })

    // 4. Respeita o limite da requisição
    if (r.tipo_limite === 'valor' && r.limite_valor != null && valorCobrado > Number(r.limite_valor) + 0.001) {
      return NextResponse.json({ error: `Valor acima do limite (R$ ${Number(r.limite_valor).toFixed(2)}).` }, { status: 422 })
    }
    if (r.tipo_limite === 'volume' && r.limite_volume != null && litros > Number(r.limite_volume) + 0.001) {
      return NextResponse.json({ error: `Litros acima do limite (${Number(r.limite_volume)} L).` }, { status: 422 })
    }

    // 5. Cria a validação
    const { data: validacao, error: insErr } = await svc
      .from('validacoes')
      .insert({
        requisicao_id: r.id,
        frentista_id:  frentista.id,
        litros,
        valor_unitario: valorUnitario,
        valor_cobrado:  valorCobrado,
        hodometro,
      })
      .select('id')
      .single()
    if (insErr) throw insErr

    // 6. Marca a requisição como concluída
    const { error: updErr } = await svc
      .from('requisicoes')
      .update({ status: 'concluido' })
      .eq('id', r.id)
      .eq('posto_id', frentista.posto_id)
    if (updErr) throw updErr

    return NextResponse.json({ registrado: true, validacaoId: validacao.id, litros, valorUnitario, valorCobrado })
  } catch (err) {
    console.error('[frentista/requisicao/registrar]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
