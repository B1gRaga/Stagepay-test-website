import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { period } from '@/lib/plans'
import type { PaidPlan } from './pricing'

// Shared by /api/billing/verify and the billing-reconcile cron, which confirm
// a payment the same way once the provider says it went through.
// Each payment buys the period chosen at checkout (pending_months): 30 days,
// 183 days or 365 days. Paying again for the same plan before it ends adds
// the days to the current end date, so renewing early loses nothing.
// The update only applies while this payment is still pending, so when two of
// the callers confirm the same payment at once, Postgres lets only one through.
export async function confirmPlanUpgrade(
  serviceClient: SupabaseClient<Database>,
  userId: string,
  plan: PaidPlan,
  ref: string,
): Promise<void> {
  const { data: current } = await serviceClient
    .from('profiles')
    .select('plan, subscription_expires_at, pending_months')
    .eq('id', userId)
    .single()

  const now = Date.now()
  const currentEnd = current?.subscription_expires_at ? new Date(current.subscription_expires_at).getTime() : 0
  const from = current?.plan === plan && currentEnd > now ? currentEnd : now
  const days = period(current?.pending_months).days
  const expiresAt = new Date(from + days * 24 * 60 * 60 * 1000).toISOString()

  await serviceClient
    .from('profiles')
    .update({
      plan,
      subscription_expires_at: expiresAt,
      pending_plan: null,
      pending_months: null,
      pending_provider: null,
      pending_currency: null,
    })
    .eq('id', userId)
    .eq('dpo_transaction_ref', ref)
    .not('pending_plan', 'is', null)
}
