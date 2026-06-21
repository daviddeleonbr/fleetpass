import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey)
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig ?? '', webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe webhook] signature error:', msg)
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 })
  }

  console.log(`[stripe webhook] event: ${event.type}`)
  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id')
        .eq('email', session.customer_email ?? '')
        .eq('role', 'posto')
        .single()
      if (perfil) {
        await supabase.from('contas_posto').upsert(
          {
            perfil_id:                  perfil.id,
            plano_id:                   session.metadata?.planId ?? 'padrao',
            stripe_customer_id:         String(session.customer),
            stripe_subscription_id:     String(session.subscription),
            stripe_subscription_status: 'active',
            assinatura_inicio:          new Date().toISOString(),
          },
          { onConflict: 'perfil_id' }
        )
      }
      console.log('[stripe] checkout completed:', {
        customer:     session.customer,
        subscription: session.subscription,
        metadata:     session.metadata,
        email:        session.customer_email,
        perfilId:     perfil?.id,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('contas_posto').update({
        stripe_subscription_status: sub.status as string,
        plano_id:                   sub.metadata?.planId ?? undefined,
        assinatura_fim:             sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null,
      }).eq('stripe_subscription_id', sub.id)
      console.log('[stripe] subscription updated:', sub.id, sub.status)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('contas_posto').update({
        stripe_subscription_status: 'canceled',
        assinatura_fim:             new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      console.log('[stripe] subscription cancelled:', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('contas_posto').update({
        stripe_subscription_status: 'past_due',
      }).eq('stripe_customer_id', String(invoice.customer))
      console.log('[stripe] payment failed:', invoice.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
