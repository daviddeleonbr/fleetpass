import { NextRequest, NextResponse } from 'next/server'

const ASAAS_BASE_SANDBOX = 'https://api-sandbox.asaas.com/v3'
const ASAAS_BASE_PROD    = 'https://api.asaas.com/v3'

export async function POST(req: NextRequest) {
  const ASAAS_KEY  = process.env.ASAAS_API_KEY ?? ''
  const ASAAS_ENV  = process.env.ASAAS_ENV ?? 'sandbox'
  const ASAAS_BASE = ASAAS_ENV === 'production' ? ASAAS_BASE_PROD : ASAAS_BASE_SANDBOX

  if (!ASAAS_KEY) {
    return NextResponse.json({ error: 'ASAAS_API_KEY não configurada no servidor.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { nome, cpfCnpj, email, telefone, valor, vencimento, descricao } =
    body as Record<string, string>

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'access_token': ASAAS_KEY,
    'User-Agent': 'FuelLink/1.0',
  }

  // 1. Criar / encontrar cliente
  let cust: Record<string, unknown>
  try {
    const custRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name:    nome,
        cpfCnpj: (cpfCnpj ?? '').replace(/\D/g, ''),
        email:   email    || undefined,
        phone:   telefone || undefined,
      }),
    })

    const custData = await custRes.json().catch(() => ({}))
    if (!custRes.ok) {
      return NextResponse.json({ error: 'Erro ao criar cliente no Asaas.', detail: custData }, { status: 400 })
    }
    cust = custData
  } catch (err) {
    return NextResponse.json({ error: 'Falha na conexão com o Asaas (customers).', detail: String(err) }, { status: 502 })
  }

  // 2. Criar cobrança (valor integral, sem split)
  try {
    const paymentBody: Record<string, unknown> = {
      customer:    cust.id,
      billingType: 'BOLETO',
      value:       Number(valor),
      dueDate:     vencimento,
      description: descricao,
    }

    const payRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentBody),
    })

    const pay = await payRes.json().catch(() => ({}))
    if (!payRes.ok) {
      return NextResponse.json({ error: 'Erro ao criar cobrança no Asaas.', detail: pay }, { status: 400 })
    }

    return NextResponse.json({
      id:          pay.id,
      status:      pay.status,
      bankSlipUrl: pay.bankSlipUrl ?? null,
      barCode:     pay.barCode     ?? pay.nossoNumero ?? '',
      dueDate:     pay.dueDate,
      value:       pay.value,
      invoiceUrl:  pay.invoiceUrl  ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Falha na conexão com o Asaas (payments).', detail: String(err) }, { status: 502 })
  }
}
