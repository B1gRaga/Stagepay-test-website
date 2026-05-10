import { NextRequest, NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function middleware(req: NextRequest) {
  if (!SAFE_METHODS.has(req.method) && req.nextUrl.pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin')
    if (origin) {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
