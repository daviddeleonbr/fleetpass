import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro.'
  }
  return String(err)
}

const STATUS_ASSINATURA: Record<string, string> = {
  active: 'Ativa', trialing: 'Em teste', past_due: 'Pagamento pendente',
  canceled: 'Cancelada', unpaid: 'Não paga', incomplete: 'Incompleta',
  incomplete_expired: 'Expirada', paused: 'Pausada',
}
const STATUS_FATURA: Record<string, string> = {
  paid: 'Paga', open: 'Em aberto', void: 'Anulada',
  uncollectible: 'Incobrável', draft: 'Rascunho',
}
const reais = (cents: number | null | undefined) => Number(cents ?? 0) / 100
const dataBR = (unix?: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString('pt-BR') : '—'

// GET /api/posto/assinatura — assinatura Stripe da conta (plano, próxima cobrança, faturas)
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc
      .from('contas_posto')
      .select('id, plano_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status')
      .eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      return NextResponse.json({ configurado: false, assinatura: null, faturas: [] })
    }
    if (!conta.stripe_subscription_id && !conta.stripe_customer_id) {
      return NextResponse.json({ configurado: true, assinatura: null, faturas: [] })
    }

    const stripe = new Stripe(key)

    // ── Assinatura ──────────────────────────────────────────────────────────
    let assinatura: Record<string, unknown> | null = null
    if (conta.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(conta.stripe_subscription_id, {
        expand: ['items.data.price.product'],
      }) as any
      const item = sub.items?.data?.[0]
      const price = item?.price
      const product = price?.product
      const quantidade = item?.quantity ?? 1
      const valorUnitario = reais(price?.unit_amount)
      // current_period_end migrou para o item nas versões recentes da API
      const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null

      assinatura = {
        plano: (product && typeof product === 'object' ? product.name : null) ?? conta.plano_id ?? 'Assinatura',
        status: sub.status,
        statusLabel: STATUS_ASSINATURA[sub.status] ?? sub.status,
        quantidade,
        valorUnitario,
        valorTotal: valorUnitario * quantidade,
        intervalo: price?.recurring?.interval === 'year' ? 'ano' : 'mês',
        moeda: (price?.currency ?? 'brl').toUpperCase(),
        proximaCobranca: sub.cancel_at_period_end ? null : (periodEnd ? { data: dataBR(periodEnd), valor: valorUnitario * quantidade } : null),
        cancelaEm: sub.cancel_at ? dataBR(sub.cancel_at) : null,
      }
    }

    // ── Histórico de faturas ────────────────────────────────────────────────
    let faturas: unknown[] = []
    if (conta.stripe_customer_id) {
      const inv = await stripe.invoices.list({ customer: conta.stripe_customer_id, limit: 12 })
      faturas = inv.data.map((f: any) => ({
        id: f.id,
        numero: f.number ?? f.id,
        data: dataBR(f.created),
        periodo: f.lines?.data?.[0]?.period
          ? `${dataBR(f.lines.data[0].period.start)} – ${dataBR(f.lines.data[0].period.end)}`
          : '—',
        valor: reais(f.total),
        status: f.status,
        statusLabel: STATUS_FATURA[f.status] ?? f.status,
        url: f.hosted_invoice_url ?? f.invoice_pdf ?? null,
      }))
    }

    return NextResponse.json({ configurado: true, assinatura, faturas })
  } catch (err) {
    console.error('[posto/assinatura]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
