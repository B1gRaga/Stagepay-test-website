import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  // getUser() verifies the JWT with Supabase servers; getSession() only
  // reads the cookie and cannot detect a tampered or revoked token.
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'No session' }, { status: 401 })

  // Return only the access token. Refresh tokens must never be exposed
  // over an HTTP endpoint — a single XSS anywhere would allow permanent
  // account takeover via indefinite token refresh.
  const { data: { session } } = await supabase.auth.getSession()
  return NextResponse.json({ access_token: session?.access_token ?? null })
}
