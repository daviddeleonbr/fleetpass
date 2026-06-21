import { NextResponse } from 'next/server'

const ASAAS_BASE = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

// GET /api/admin/asaas/subcontas — lista todas as subcontas no Asaas
export async function GET() {
  const key = process.env.ASAAS_API_KEY
  if (!key) return NextResponse.json({ error: 'ASAAS_API_KEY não configurada.' }, { status: 500 })

  try {
    // Asaas pagina com offset; buscamos até 100 por chamada
    const all: unknown[] = []
    let offset = 0
    const limit = 100

    while (true) {
      const res  = await fetch(`${ASAAS_BASE}/accounts?limit=${limit}&offset=${offset}`, {
        headers: { 'access_token': key, 'User-Agent': 'FuelLink/1.0' },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data?.errors?.[0]?.description ?? 'Erro ao listar subcontas.', detail: data }, { status: 400 })

      const items: unknown[] = data.data ?? []
      all.push(...items)
      if (!data.hasMore || items.length < limit) break
      offset += limit
    }

    const subcontas = (all as Record<string, unknown>[]).map(a => ({
      id:            a.id,
      name:          a.name,
      email:         a.email,
      cpfCnpj:       a.cpfCnpj,
      status:        a.status,          // ACTIVE | PENDING | DISABLED
      walletId:      a.walletId ?? null,
      city:          a.city ?? null,
      state:         a.state ?? null,
      loginEmail:    a.loginEmail ?? null,
      accountNumber: a.accountNumber ?? null,
    }))

    return NextResponse.json({ subcontas, total: subcontas.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
