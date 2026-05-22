import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/clients',
  '/reminders',
  '/new-invoice',
  '/settings',
  '/tutorial',
  '/onboarding',
]

export async function middleware(request: NextRequest) {
  // Build a mutable response so Supabase can refresh auth cookies.
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Write refreshed cookies back to both the forwarded request and
          // the response so the browser receives them.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() verifies the JWT with Supabase servers (secure).
  // getSession() only reads the local cookie and cannot detect a revoked token.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  // Redirect unauthenticated users away from protected routes.
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Forward the verified identity to server components and API routes via
    // request headers. getCachedUser() reads these headers first, which means
    // no additional Supabase auth round-trip is needed anywhere in the app.
    const forwardedHeaders = new Headers(request.headers)
    forwardedHeaders.set('x-user-id', user.id)
    forwardedHeaders.set('x-user-email', user.email ?? '')

    return NextResponse.next({
      request: { headers: forwardedHeaders },
      headers: response.headers,
    })
  }

  return response
}

export const config = {
  matcher: [
    // Run on every route except Next.js internals, static assets, and cron endpoints.
    '/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico|icons|manifest\\.json|api/cron).*)',
  ],
}
