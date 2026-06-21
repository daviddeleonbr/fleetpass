import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ASAAS_BASE_SANDBOX = 'https://api-sandbox.asaas.com/v3'
const ASAAS_BASE_PROD    = 'https://api.asaas.com/v3'

export async function POST(req: NextRequest) {
  const ASAAS_KEY  = process.env.ASAAS_API_KEY ?? ''
  const ASAAS_ENV  = process.env.ASAAS_ENV ?? 'sandbox'
  const ASAAS_BASE = ASAAS_ENV === 'production' ? ASAAS_BASE_PROD : ASAAS_BASE_SANDBOX

  if (!ASAAS_KEY) {
    return NextResponse.json({ error: 'ASAAS_API_KEY não configurada.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const {
    nome,
    email,
    cpfCnpj,
    tipoEmpresa,
    telefone,
    celular,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
  } = body as Record<string, string>
  const incomeValue = Number((body as Record<string, unknown>).incomeValue ?? 0)

  // Campos obrigatórios
  if (!nome || !email || !cpfCnpj || !cep || !endereco || !numero || !bairro) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: nome, email, cpfCnpj, cep, endereco, numero, bairro.' },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = {
    name:          nome,
    email:         email,
    cpfCnpj:       cpfCnpj.replace(/\D/g, ''),
    companyType:   tipoEmpresa || 'LIMITED',
    postalCode:    cep.replace(/\D/g, ''),
    address:       endereco,
    addressNumber: numero,
    province:      bairro,
    city:          cidade || undefined,
    state:         estado || undefined,
  }

  if (incomeValue > 0) payload.incomeValue = incomeValue
  if (complemento)    payload.complement  = complemento
  if (telefone)       payload.phone       = telefone.replace(/\D/g, '')
  if (celular)        payload.mobilePhone = celular.replace(/\D/g, '')

  console.log('[subconta] Criando subconta para:', nome, cpfCnpj)

  try {
    const res = await fetch(`${ASAAS_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_KEY,
        'User-Agent': 'FuelLink/1.0',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    console.log('[subconta] Resposta Asaas:', res.status, JSON.stringify(data).slice(0, 200))

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Erro ao criar subconta no Asaas.', detail: data },
        { status: 400 }
      )
    }

    // Persiste IDs no banco — localiza pelo CNPJ (funciona para posto novo e para vinculação posterior)
    if (data.id) {
      const svc = createServiceClient()
      await svc.from('postos').update({
        asaas_id:        data.id,
        asaas_wallet_id: data.walletId ?? null,
        asaas_api_key:   data.apiKey   ?? null,
      }).eq('cnpj', cpfCnpj.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'))
    }

    return NextResponse.json({
      id:            data.id,
      walletId:      data.walletId      ?? null,
      apiKey:        data.apiKey        ?? null,
      accountNumber: data.accountNumber ?? null,
      loginEmail:    data.loginEmail    ?? email,
      status:        data.status        ?? 'ACTIVE',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha na conexão com o Asaas.', detail: String(err) },
      { status: 502 }
    )
  }
}
