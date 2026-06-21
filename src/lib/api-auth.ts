import { createClient as createRawClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createClient } from './supabase-server'

/**
 * Resolve o usuário autenticado por cookie (web) OU por Bearer token (app mobile).
 * A web autentica via sessão em cookie; o app, via JWT do Supabase.
 */
export async function getAuthUser(req: NextRequest) {
  const header = req.headers.get('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    const accessToken = header.slice(7).trim()
    const raw = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: { user } } = await raw.auth.getUser(accessToken)
    return user
  }
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user
}
