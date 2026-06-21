// Cria (ou reaproveita) o ÚNICO produto/preço Stripe do modelo "por CNPJ".
// Cobrança recorrente mensal, valor por CNPJ (posto) cadastrado na conta.
// Uso: node scripts/criar-plano-cnpj.mjs
import Stripe from 'stripe'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const VALOR_CENTAVOS = 4990 // R$ 49,90 por CNPJ/mês

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

// Reaproveita um produto existente com metadata.planId === 'padrao'
const existentes = await stripe.products.list({ limit: 100, active: true })
let product = existentes.data.find((p) => p.metadata?.planId === 'padrao')

if (!product) {
  product = await stripe.products.create({
    name: 'FuelLink — Assinatura por CNPJ',
    description: 'Cobrança recorrente mensal por CNPJ (posto) cadastrado na conta.',
    metadata: { planId: 'padrao', popular: 'true' },
  })
  console.log('Produto criado:', product.id)
} else {
  console.log('Produto reaproveitado:', product.id)
}

// Procura um preço mensal ativo desse produto com o valor desejado
const precos = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
let price = precos.data.find(
  (p) => p.recurring?.interval === 'month' && p.unit_amount === VALOR_CENTAVOS && p.currency === 'brl'
)

if (!price) {
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: VALOR_CENTAVOS,
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: { planId: 'padrao' },
  })
  console.log('Preço criado:', price.id)
} else {
  console.log('Preço reaproveitado:', price.id)
}

await stripe.products.update(product.id, { default_price: price.id })

console.log('\n# Adicione ao .env.local:')
console.log(`STRIPE_PRICE_PADRAO=${price.id}`)
