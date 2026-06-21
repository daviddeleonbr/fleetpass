import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from './supabase-server'

type AdminOk = { ok: true; userId: string; svc: ReturnType<typeof createServiceClient> }
type AdminErr = { ok: false; response: NextResponse }

/**
 * Exige um usuário autenticado com perfis.role = 'admin'.
 * Use no topo de TODA rota /api/admin/*:
 *   const a = await requireAdmin(); if (!a.ok) return a.response
 *   const svc = a.svc  // service client (bypassa RLS) já autorizado
 */
export async function requireAdmin(): Promise<AdminOk | AdminErr> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) }
  }

  const svc = createServiceClient()
  const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
  if ((perfil?.role as string) !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, svc }
}

export function adminError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}
