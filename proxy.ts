import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SIGNUPS_OPEN } from '@/lib/launch'

// '/api/auth/check-password' is called by sign-up before an account exists;
// it's rate-limited by IP and only ever sends a 5-character hash prefix out.
const PUBLIC_PATHS = ['/', '/app', '/api/invoices/public', '/invoice', '/api/waitlist', '/api/auth/check-password']

const PORTAL_PATHS = [
  '/dashboard', '/invoices', '/clients', '/reminders',
  '/new-invoice', '/settings', '/tutorial', '/onboarding',
]

function isPortalPath(pathname: string) {
  return PORTAL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// Reads the `aal` claim from an access token that getUser() has already verified.
function tokenAal(token: string | undefined): string | null {
  try {
    const b64 = token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '='))).aal ?? null
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  // Collect cookies that Supabase wants to set (token refresh),
  // apply them to the final response at the end.
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => { cookiesToSet.push(...cookies) },
      },
    }
  )

  // Refresh session — required for Server Components
  let { data: { user } } = await supabase.auth.getUser()

  // Fall back to Bearer token for clients that can't use cookies (e.g. app.html)
  let bearerToken: string | undefined
  if (!user) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const { data: bearerData } = await supabase.auth.getUser(authHeader.slice(7))
      user = bearerData?.user ?? null
      if (user) bearerToken = authHeader.slice(7)
    }
  }

  // MFA: a user with a verified factor must have completed it (aal2) for this
  // session. A password-only session (aal1) is treated as half signed in.
  let needsMfa = false
  if (user?.factors?.some(f => f.status === 'verified')) {
    const token = bearerToken ?? (await supabase.auth.getSession()).data.session?.access_token
    needsMfa = tokenAal(token) !== 'aal2'
  }

  const { pathname } = request.nextUrl

  // Before launch the sign-up page sends people to the waitlist instead.
  if (!SIGNUPS_OPEN && (pathname === '/auth/signup' || pathname.startsWith('/auth/signup/'))) {
    return NextResponse.redirect(new URL('/#waitlist', request.url))
  }

  const isPublic =PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Portal route protection — redirect unauthenticated users at the Edge
  if (!user && isPortalPath(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // API route protection
  if (pathname.startsWith('/api/') && !isPublic && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // MFA not completed: portal → the code page, API → 401. Refreshed session
  // cookies still go out so the user stays signed in for the code step.
  if (needsMfa && (isPortalPath(pathname) || (pathname.startsWith('/api/') && !isPublic))) {
    const blocked = isPortalPath(pathname)
      ? NextResponse.redirect(new URL('/auth/mfa', request.url))
      : NextResponse.json({ error: 'MFA required' }, { status: 401 })
    cookiesToSet.forEach(({ name, value, options }) =>
      blocked.cookies.set(name, value, options as Parameters<typeof blocked.cookies.set>[2])
    )
    return blocked
  }

  // CSRF: reject cross-origin mutations. Requests without Origin (server-to-server,
  // Bearer token clients) are allowed through — only browser cross-origin requests
  // carry an Origin that doesn't match the host.
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
  if (pathname.startsWith('/api/') && !SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('origin')
    if (origin) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // Forward verified identity to server components via internal headers.
  // Safe on Vercel: proxy always runs before server functions and external
  // clients cannot inject these headers past it.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-user-id')
  requestHeaders.delete('x-user-email')
  if (user) {
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email ?? '')
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Apply token-refresh cookies to the outgoing response
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )

  return response
}

// `.+` rather than `.*` leaves out the bare `/`: the landing page is static and
// needs no session, so it's served straight from the CDN without a proxy hop.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).+)',
  ],
}
