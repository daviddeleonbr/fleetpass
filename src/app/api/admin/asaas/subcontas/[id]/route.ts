import { NextRequest, NextResponse } from 'next/server'

const ASAAS_BASE = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3'

// PATCH /api/admin/asaas/subcontas/[id] — atualiza o e-mail da subconta
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const key = process.env.ASAAS_API_KEY
  if (!key) return NextResponse.json({ error: 'ASAAS_API_KEY não configurada.' }, { status: 500 })

  const { id } = await params

  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido.' }, { status: 400 }) }

  if (!body.email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

  try {
    const res = await fetch(`${ASAAS_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'access_token': key,
        'User-Agent': 'FuelLink/1.0',
      },
      body: JSON.stringify({ email: body.email }),
    })

    let data: Record<string, unknown> | null = null
    const text = await res.text()
    if (text) { try { data = JSON.parse(text) } catch { /* ignore */ } }

    if (!res.ok) {
      const errors = data?.errors as { description?: string }[] | undefined
      const desc = errors?.[0]?.description ?? `Erro ao atualizar subconta (HTTP ${res.status}).`
      return NextResponse.json({ error: desc, detail: data }, { status: res.status })
    }

    return NextResponse.json({ ok: true, email: (data?.email as string) ?? body.email })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
