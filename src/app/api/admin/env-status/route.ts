import { NextResponse } from 'next/server'

const GROUPS = {
  asaas: [
    { key: 'ASAAS_API_KEY',       label: 'Chave de API Asaas' },
    { key: 'ASAAS_ENV',           label: 'Ambiente (sandbox / production)' },
    { key: 'FUELLINK_TAXA_SPLIT', label: 'Taxa split FleetPass (%)' },
  ],
  supabase: [
    { key: 'NEXT_PUBLIC_SUPABASE_URL',      label: 'URL do projeto' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Anon Key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY',     label: 'Service Role Key' },
  ],
  stripe: [
    { key: 'STRIPE_SECRET_KEY',      label: 'Chave secreta' },
    { key: 'STRIPE_WEBHOOK_SECRET',  label: 'Webhook Secret' },
  ],
  outros: [
    { key: 'SMTP_HOST', label: 'Host SMTP (e-mails)' },
  ],
}

function mapVars(vars: { key: string; label: string }[]) {
  return vars.map(({ key, label }) => ({ key, label, status: !!process.env[key]?.trim() }))
}

export async function GET() {
  return NextResponse.json({
    asaas:    mapVars(GROUPS.asaas),
    supabase: mapVars(GROUPS.supabase),
    stripe:   mapVars(GROUPS.stripe),
    outros:   mapVars(GROUPS.outros),
  })
}
