import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 500 })

  const stripe = new Stripe(key)

  const [products, prices] = await Promise.all([
    stripe.products.list({ limit: 100, active: true }),
    stripe.prices.list({ limit: 100, active: true, recurring: { interval: 'month' } }),
  ])

  const planos = products.data
    .map((product) => {
      const price = prices.data.find(
        (p) => (typeof p.product === 'string' ? p.product : p.product?.id) === product.id
      )
      if (!price) return null

      return {
        id:         product.metadata?.planId ?? product.id,
        stripeProductId: product.id,
        stripePriceId:   price.id,
        nome:       product.name,
        descricao:  product.description ?? '',
        valor:      (price.unit_amount ?? 0) / 100,
        maxPostos:  product.metadata?.maxPostos ?? null,
        popular:    product.metadata?.popular === 'true',
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a!.valor ?? 0) - (b!.valor ?? 0))

  return NextResponse.json({ planos })
}
