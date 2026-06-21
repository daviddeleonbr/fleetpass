import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const payment = (body.payment as Record<string, unknown>) ?? {}
  const paymentId  = String(payment.id  ?? body.id  ?? '')
  const status     = String(payment.status ?? body.status ?? '')
  const paymentDate = String(payment.paymentDate ?? body.paymentDate ?? '') || null

  console.log('[webhook] Evento recebido:', body.event, '| payment:', paymentId, '| status:', status)

  if (paymentId) {
    const supabase = createServiceClient()

    await supabase.from('boletos').update({
      status,
      pago_em: paymentDate ? new Date(paymentDate).toISOString() : null,
    }).eq('asaas_payment_id', paymentId)

    if (['RECEIVED', 'CONFIRMED'].includes(status)) {
      const { data: boleto } = await supabase
        .from('boletos')
        .select('faturamento_id')
        .eq('asaas_payment_id', paymentId)
        .single()

      if (boleto) {
        await supabase.from('faturamentos').update({
          status:  'pago',
          pago_em: new Date().toISOString(),
        }).eq('id', boleto.faturamento_id)

        await supabase.from('abastecimentos').update({
          status: 'faturado',
        }).in('id', (
          await supabase
            .from('faturamento_abastecimentos')
            .select('abastecimento_id')
            .eq('faturamento_id', boleto.faturamento_id)
            .then(({ data }) => (data ?? []).map((r: { abastecimento_id: string }) => r.abastecimento_id))
        ))
      }
    }
  }

  return NextResponse.json({ received: true })
}
