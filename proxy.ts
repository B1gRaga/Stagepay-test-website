import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/app', '/api/invoices/public', '/invoice']

const PORTAL_PATHS = [
  '/dashboard', '/invoices', '/clients', '/reminders',
  '/new-invoice', '/settings', '/tutorial', '/onboarding',
]

function isPortalPath(pathname: string) {
  return PORTAL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
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
  if (!user) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const { data: bearerData } = await supabase.auth.getUser(authHeader.slice(7))
      user = bearerData?.user ?? null
    }
  }

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Portal route protection — redirect unauthenticated users at the Edge
  if (!user && isPortalPath(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // API route protection
  if (pathname.startsWith('/api/') && !isPublic && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
