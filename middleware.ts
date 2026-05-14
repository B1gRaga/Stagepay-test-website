import { type NextRequest, NextResponse } from 'next/server'

// Mutating HTTP methods that require an Origin check
const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// Routes exempt from Origin checking:
//  - /api/cron/* — authenticated by CRON_SECRET header, not cookies
//  - /api/billing/callback — server-to-server webhook from DPO Pay
const EXEMPT = ['/api/cron/', '/api/billing/callback']

function isExempt(pathname: string) {
  return EXEMPT.some(prefix => pathname.startsWith(prefix))
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()

  // Always allow localhost for local development
  origins.add('http://localhost:3000')
  origins.add('http://localhost')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin)
    } catch {
      // malformed env var — ignore
    }
  }

  return origins
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only apply to API routes with mutating methods
  if (!pathname.startsWith('/api/') || !MUTATING.has(req.method)) {
    return NextResponse.next()
  }

  if (isExempt(pathname)) {
    return NextResponse.next()
  }

  const origin = req.headers.get('origin')

  // Requests with no Origin header come from same-origin navigations or
  // server-to-server calls — allow them through.
  if (!origin) {
    return NextResponse.next()
  }

  const allowed = getAllowedOrigins()
  if (!allowed.has(origin)) {
    return NextResponse.json(
      { error: 'Forbidden: cross-origin request rejected' },
      { status: 403 },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
