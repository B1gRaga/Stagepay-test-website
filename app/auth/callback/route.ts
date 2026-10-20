import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Where to go after signing in. Only paths on this site are accepted, so the
  // link can't be used to send someone elsewhere.
  const nextParam = searchParams.get('next') ?? ''
  const next = /^\/(?![/\\])[\w\-/]*$/.test(nextParam) ? nextParam : '/dashboard'
  const isReset = next === '/auth/reset-password'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(isReset
    ? `${origin}/auth/forgot-password?expired=1`
    : `${origin}/auth/login?error=Could+not+confirm+email`)
}
