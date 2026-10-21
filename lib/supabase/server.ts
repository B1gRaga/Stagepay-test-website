import { createServerClient } from '@supabase/ssr'
import { createClient as createJsClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Per-request cached user lookup.
// When middleware has verified the session it forwards the identity via
// x-user-id / x-user-email headers — we read those directly (no Supabase
// round-trip). Falls back to auth.getUser() for routes not covered by middleware
// (e.g. API routes that call this directly).
export const getCachedUser = cache(async () => {
  const h = await headers()
  const userId = h.get('x-user-id')
  const userEmail = h.get('x-user-email')
  if (userId) {
    return { id: userId, email: userEmail ?? undefined } as { id: string; email?: string }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Per-request cached profile of a business — deduplicates across layout + page within
// the same render. Callers pass a server-derived id (getAccount().accountId), and a team
// member may read their team's business, which the access rules don't allow, so this
// uses the service client and only the columns below.
export const getCachedProfile = cache(async (userId: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('name, firm_name, plan, business_type, default_currency')
    .eq('id', userId)
    .single()
  return data
})

// Dual-auth context: works with both cookie sessions (Next.js pages) and
// Bearer tokens (app.html vanilla client). Returns a supabase client and
// the verified user, or { supabase, user: null } if unauthenticated.
export async function getAuthContext(req: { headers: { get(name: string): string | null } }) {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createJsClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    return { supabase, user }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// Service role client — bypasses RLS, only use in trusted server code
export function createServiceClient() {
  return createJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
