import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 })
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { planId, priceId: priceIdFromBody, email, nome } = body

  if (!planId) {
    return NextResponse.json({ error: 'planId obrigatório.' }, { status: 400 })
  }

  // Aceita priceId direto (vindo da listagem Stripe) ou fallback para env vars
  const priceId = priceIdFromBody || process.env[`STRIPE_PRICE_${planId.toUpperCase()}`]

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID para o plano "${planId}" não encontrado.` },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeKey)
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    // Busca metadados do produto para passar maxPostos no metadata da sessão
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
    const product = price.product as Stripe.Product
    const maxPostos = product.metadata?.maxPostos ?? 'ilimitado'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Permite o cliente digitar um código promocional (ex.: 100% grátis para teste)
      allow_promotion_codes: true,
      customer_email: email || undefined,
      success_url: `${origin}/cadastro/posto/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/cadastro/posto?plano=cancelado`,
      metadata: {
        nome:      nome      ?? '',
        planId,
        maxPostos,
      },
      subscription_data: {
        metadata: { planId, maxPostos },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao criar sessão Stripe: ${msg}` }, { status: 502 })
  }
}
