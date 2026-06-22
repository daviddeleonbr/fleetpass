import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /auth/recuperar?token_hash=...&type=recovery
 *
 * Destino do link do e-mail de recuperação (Supabase). Verifica o token via
 * verifyOtp, o que cria a sessão de recuperação em cookie, e redireciona para
 * a tela de definir nova senha. Padrão server-side recomendado pelo Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}/recuperar-senha/redefinir`)
    }
  }

  // Token ausente, inválido ou expirado
  return NextResponse.redirect(`${origin}/recuperar-senha?erro=link`)
}
