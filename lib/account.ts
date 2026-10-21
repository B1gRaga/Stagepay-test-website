import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createClient, createServiceClient, getCachedUser } from '@/lib/supabase/server'

export type Role = 'owner' | 'admin' | 'staff'

// Who is signed in, and which business they are working in.
// userId    — the person (sign-in, password, two-step, rate limits).
// accountId — the business whose invoices, clients and settings they see.
//             Their own id unless they switched to a team they belong to.
// role      — 'owner' in their own business, otherwise their team role.
export type Account = { userId: string; accountId: string; role: Role }

// The database works out the account (current_account_id / current_account_role,
// migration 034), so the app always agrees with the access rules. Most people
// never switch business, so one cheap profile read settles it without the RPCs.
// `supabase` must be signed in as `userId`.
export async function resolveAccount(supabase: SupabaseClient<Database>, userId: string): Promise<Account> {
  const { data: me } = await supabase.from('profiles').select('current_account_id').eq('id', userId).single()
  if (!me?.current_account_id || me.current_account_id === userId) {
    return { userId, accountId: userId, role: 'owner' }
  }
  const [{ data: accountId }, { data: role }] = await Promise.all([
    supabase.rpc('current_account_id'),
    supabase.rpc('current_account_role'),
  ])
  const id = (accountId as string | null) || userId
  return { userId, accountId: id, role: id === userId ? 'owner' : ((role as Role | null) ?? 'staff') }
}

// For pages and cookie-signed-in API routes.
export const getAccount = cache(async (): Promise<Account | null> => {
  const user = await getCachedUser()
  if (!user) return null
  return resolveAccount(await createClient(), user.id)
})

// Owners and admins may change the business's settings and delete invoices.
export function canManage(account: Account) {
  return account.role === 'owner' || account.role === 'admin'
}

// The business's own profile row (firm details, branding, plan, defaults).
// A person can only read their own profile through the access rules, so a team
// member reads their team's with the service client; accountId always comes
// from resolveAccount(), which the database has already checked.
export async function accountProfileClient(account: Account) {
  return account.accountId === account.userId ? createClient() : createServiceClient()
}
