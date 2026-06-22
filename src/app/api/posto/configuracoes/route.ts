import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

const NOTIF_KEYS = [
  'emailBloqueio', 'emailFatura', 'emailCredito',
  'whatsappBloqueio', 'whatsappFatura', 'whatsappCredito',
] as const
type NotifPrefs = Record<(typeof NOTIF_KEYS)[number], boolean>

const NOTIF_DEFAULT: NotifPrefs = {
  emailBloqueio: true, emailFatura: true, emailCredito: true,
  whatsappBloqueio: false, whatsappFatura: true, whatsappCredito: false,
}

const chaveNotif = (contaId: string) => `notificacoes_posto:${contaId}`

// Lê apenas as chaves conhecidas do body, sempre como boolean (anti mass-assignment)
function sanitizeNotif(input: unknown): NotifPrefs {
  const src = (input ?? {}) as Record<string, unknown>
  const out = { ...NOTIF_DEFAULT }
  for (const k of NOTIF_KEYS) if (typeof src[k] === 'boolean') out[k] = src[k] as boolean
  return out
}

// ── GET — dados da conta + preferências de notificação ───────────────────────
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any

    const { data: perfil } = await svc
      .from('perfis').select('nome, email, telefone, cargo').eq('id', user.id).single()

    const { data: conta } = await svc
      .from('contas_posto').select('id, plano_id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc
      .from('postos').select('nome').eq('conta_posto_id', conta.id)

    const { data: cfg } = await svc
      .from('configuracoes').select('valor').eq('chave', chaveNotif(conta.id)).maybeSingle()
    let notificacoes = NOTIF_DEFAULT
    if (cfg?.valor) { try { notificacoes = sanitizeNotif(JSON.parse(cfg.valor)) } catch { /* default */ } }

    return NextResponse.json({
      conta: {
        nome:     perfil?.nome ?? '—',
        email:    perfil?.email ?? user.email ?? '—',
        telefone: perfil?.telefone ?? '—',
        cargo:    perfil?.cargo ?? 'Responsável',
        plano:    conta.plano_id ?? '—',
        postos:   (postos ?? []).map((p: any) => p.nome),
      },
      notificacoes,
    })
  } catch (err) {
    console.error('[posto/configuracoes GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// ── PUT — salva preferências de notificação ──────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc
      .from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const notificacoes = sanitizeNotif(body?.notificacoes)

    const { error } = await svc.from('configuracoes').upsert({
      chave:     chaveNotif(conta.id),
      valor:     JSON.stringify(notificacoes),
      descricao: 'Preferências de notificação do posto',
    }, { onConflict: 'chave' })
    if (error) throw error

    return NextResponse.json({ salvo: true, notificacoes })
  } catch (err) {
    console.error('[posto/configuracoes PUT]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
