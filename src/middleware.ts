import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/cadastro',
  '/cadastro/empresa',
  '/cadastro/posto',
  '/cadastro/posto/sucesso',
  '/recuperar-senha',
  // Callback de verificação do link de recuperação (verifyOtp) — acontece antes
  // de existir sessão, então precisa ser público.
  '/auth',
  // Tela de validação do frentista: faz o próprio login (modelo terminal/quiosque).
  // O acesso aos dados é protegido nas rotas de API, não aqui.
  '/frentista/validar',
]

const ROLE_HOME: Record<string, string> = {
  empresa:   '/empresa',
  posto:     '/posto',
  frentista: '/frentista/validar',
  admin:     '/admin',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Estáticos e rotas de API não precisam de refresh de sessão aqui: as rotas de
  // API fazem sua própria validação de auth e estáticos são públicos. Retornar
  // antes evita um getUser() de rede (ao Supabase Auth) desperdiçado em TODA
  // chamada /api — que antes acontecia porque o getUser rodava antes deste check.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do NOT use getSession() — it reads from storage without
  // validating the JWT. getUser() sends a request to the Supabase Auth
  // server every time to revalidate the Auth token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )

  // Not authenticated → redirect to login (unless already on public route)
  if (!user) {
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Authenticated user on login page → redirect to their dashboard
  if (pathname === '/login') {
    const role = user.user_metadata?.role as string | undefined
    const home = ROLE_HOME[role ?? ''] ?? '/empresa'
    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
