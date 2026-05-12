import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  // getUser() verifies the JWT with Supabase servers; getSession() only
  // reads the cookie and cannot detect a tampered or revoked token.
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'No session' }, { status: 401 })

  // The PWA (app.html) cannot read HttpOnly Supabase cookies, so it calls
  // this endpoint to bridge sessions. We expose the refresh_token here because:
  // (a) it's already stored in the browser's cookie that generated this request,
  // (b) the endpoint itself requires a valid cookie session to reach, and
  // (c) without it the PWA client cannot call setSession() and is fully broken.
  // The response must never be cached.
  const { data: { session } } = await supabase.auth.getSession()
  const response = NextResponse.json({
    access_token:  session?.access_token  ?? null,
    refresh_token: session?.refresh_token ?? null,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
