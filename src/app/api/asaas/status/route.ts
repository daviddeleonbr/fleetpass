import { NextRequest, NextResponse } from 'next/server'

const ASAAS_BASE_SANDBOX = 'https://api-sandbox.asaas.com/v3'
const ASAAS_BASE_PROD    = 'https://api.asaas.com/v3'

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('id')
  if (!paymentId) {
    return NextResponse.json({ error: 'Parâmetro id obrigatório.' }, { status: 400 })
  }

  const ASAAS_KEY  = process.env.ASAAS_API_KEY ?? ''
  const ASAAS_ENV  = process.env.ASAAS_ENV ?? 'sandbox'
  const ASAAS_BASE = ASAAS_ENV === 'production' ? ASAAS_BASE_PROD : ASAAS_BASE_SANDBOX

  if (!ASAAS_KEY) {
    return NextResponse.json({ error: 'ASAAS_API_KEY não configurada.' }, { status: 500 })
  }

  try {
    const res = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, {
      headers: {
        'access_token': ASAAS_KEY,
        'User-Agent': 'FuelLink/1.0',
      },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao consultar pagamento.', detail: data }, { status: 400 })
    }
    return NextResponse.json({
      id:          data.id,
      status:      data.status,
      value:       data.value,
      dueDate:     data.dueDate,
      paymentDate: data.paymentDate ?? null,
      bankSlipUrl: data.bankSlipUrl ?? null,
      barCode:     data.barCode ?? null,
      invoiceUrl:  data.invoiceUrl ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Falha na conexão com o Asaas.', detail: String(err) }, { status: 502 })
  }
}
