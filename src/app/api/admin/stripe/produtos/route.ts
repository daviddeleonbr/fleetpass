import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAdmin } from '@/lib/admin-auth'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.')
  return new Stripe(key)
}

// ---------------------------------------------------------------------------
// GET — Lista produtos ativos com seus preços
// ---------------------------------------------------------------------------
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  try {
    const stripe = getStripe()

    const [products, prices] = await Promise.all([
      stripe.products.list({ limit: 100, active: true }),
      stripe.prices.list({ limit: 100, active: true, expand: ['data.product'] }),
    ])

    const result = products.data.map((product) => {
      const productPrices = prices.data
        .filter((p) => (typeof p.product === 'string' ? p.product : p.product?.id) === product.id)
        .map((p) => ({
          id: p.id,
          valor: (p.unit_amount ?? 0) / 100,
          moeda: p.currency.toUpperCase(),
          intervalo: p.recurring?.interval ?? 'one_time',
          intervaloCount: p.recurring?.interval_count ?? 1,
          ativo: p.active,
        }))

      return {
        id: product.id,
        nome: product.name,
        descricao: product.description ?? '',
        ativo: product.active,
        maxPostos: product.metadata?.maxPostos ?? null,
        planId: product.metadata?.planId ?? null,
        precos: productPrices,
        criadoEm: product.created,
      }
    })

    // Ordena por data de criação (mais antigo primeiro)
    result.sort((a, b) => a.criadoEm - b.criadoEm)

    return NextResponse.json({ produtos: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Cadastra novo produto + preço no Stripe
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  try {
    const stripe = getStripe()

    const body = await req.json()
    const { nome, descricao, valor, intervalo, planId } = body

    if (!nome || !valor || !intervalo) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, valor, intervalo.' }, { status: 400 })
    }

    const valorCentavos = Math.round(parseFloat(valor) * 100)
    if (isNaN(valorCentavos) || valorCentavos <= 0) {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }

    // Cria o produto (cobrança por CNPJ — sem teto de postos)
    const product = await stripe.products.create({
      name: nome,
      description: descricao || undefined,
      metadata: {
        ...(planId ? { planId } : {}),
      },
    })

    // Cria o preço associado
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: valorCentavos,
      currency: 'brl',
      recurring: {
        interval: intervalo === 'ano' ? 'year' : 'month',
      },
      metadata: {
        ...(planId ? { planId } : {}),
      },
    })

    return NextResponse.json({
      produto: {
        id: product.id,
        nome: product.name,
        descricao: product.description ?? '',
        maxPostos: product.metadata?.maxPostos ?? null,
        planId: product.metadata?.planId ?? null,
      },
      preco: {
        id: price.id,
        valor: (price.unit_amount ?? 0) / 100,
        moeda: price.currency.toUpperCase(),
        intervalo: price.recurring?.interval ?? 'month',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — Atualiza o preço de um produto (arquiva o antigo, cria novo)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  try {
    const stripe = getStripe()

    const body = await req.json()
    const { productId, priceId, novoValor, intervalo } = body

    if (!productId || !novoValor || !intervalo) {
      return NextResponse.json({ error: 'Campos obrigatórios: productId, novoValor, intervalo.' }, { status: 400 })
    }

    const valorCentavos = Math.round(parseFloat(novoValor) * 100)
    if (isNaN(valorCentavos) || valorCentavos <= 0) {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }

    // Busca metadata do produto para preservar planId
    const product = await stripe.products.retrieve(productId)

    // Cria o novo preço
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: valorCentavos,
      currency: 'brl',
      recurring: {
        interval: intervalo === 'ano' ? 'year' : 'month',
      },
      metadata: {
        ...(product.metadata?.planId ? { planId: product.metadata.planId } : {}),
      },
    })

    // Move o preço padrão para o novo ANTES de arquivar o antigo — o Stripe não
    // permite arquivar um preço enquanto ele for o default_price do produto.
    await stripe.products.update(productId, { default_price: newPrice.id })

    // Agora pode arquivar o preço anterior (já não é mais o default)
    if (priceId && priceId !== newPrice.id) {
      await stripe.prices.update(priceId, { active: false })
    }

    return NextResponse.json({
      preco: {
        id: newPrice.id,
        valor: (newPrice.unit_amount ?? 0) / 100,
        moeda: newPrice.currency.toUpperCase(),
        intervalo: newPrice.recurring?.interval ?? 'month',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — Arquiva um produto (e seus preços) no Stripe
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  try {
    const stripe = getStripe()

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId obrigatório.' }, { status: 400 })
    }

    // Arquiva o produto (some da lista de ativos). O Stripe permite arquivar o
    // produto mesmo que ele tenha um default_price.
    const product = await stripe.products.update(productId, { active: false })

    // Arquiva os preços NÃO-default (o default_price não pode ser arquivado).
    const defaultPriceId = typeof product.default_price === 'string'
      ? product.default_price
      : product.default_price?.id ?? null
    const prices = await stripe.prices.list({ product: productId, active: true })
    await Promise.all(
      prices.data
        .filter((p) => p.id !== defaultPriceId)
        .map((p) => stripe.prices.update(p.id, { active: false }).catch(() => {})),
    )

    return NextResponse.json({ arquivado: true, id: product.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
