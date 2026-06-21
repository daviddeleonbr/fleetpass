import Stripe from 'stripe'
import { createServiceClient } from './supabase-server'

/**
 * Sincroniza a quantidade da assinatura Stripe da conta de posto com o número
 * de CNPJs (postos ativos) cadastrados. Modelo de cobrança "por CNPJ": cada
 * posto/unidade adicionado entra na conta da assinatura.
 *
 * Idempotente: define quantity = nº de postos ativos (mínimo 1). Não-fatal —
 * nunca interrompe o fluxo que a chamou; apenas loga em caso de erro. No-op
 * quando a conta ainda não tem assinatura (dev / antes do checkout).
 */
export async function syncQuantidadeCnpj(contaPostoId: string): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return

  try {
    const svc = createServiceClient() as any

    const { data: conta } = await svc
      .from('contas_posto')
      .select('stripe_subscription_id')
      .eq('id', contaPostoId)
      .maybeSingle()

    const subId = conta?.stripe_subscription_id as string | null | undefined
    if (!subId) return // sem assinatura ainda → nada a sincronizar

    const { count } = await svc
      .from('postos')
      .select('id', { count: 'exact', head: true })
      .eq('conta_posto_id', contaPostoId)
      .eq('status', 'ativo')

    const quantidade = Math.max(1, count ?? 1)

    const stripe = new Stripe(key)
    const sub = await stripe.subscriptions.retrieve(subId)
    const item = sub.items.data[0]
    if (!item) return
    if (item.quantity === quantidade) return // já está correto

    await stripe.subscriptionItems.update(item.id, {
      quantity: quantidade,
      proration_behavior: 'create_prorations',
    })
  } catch (err) {
    console.error('[stripe-cnpj] falha ao sincronizar quantidade de CNPJs:', err)
  }
}
