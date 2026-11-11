import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'
import { providerById, confirmPlanUpgrade } from '@/lib/billing'
import type { PaidPlan } from '@/lib/billing/pricing'

export const runtime = 'nodejs'
export const maxDuration = 60

// A payment still unconfirmed this long after the provider's own time limit
// (provider.ttlMs; DPO's is 30 minutes) was abandoned, not just slow.
const GRACE_MS = 5 * 60 * 1000
// Give the redirect (/api/billing/verify) a head start before we step in;
// most payments are confirmed there.
const MIN_AGE_MS = 5 * 60 * 1000

// Called by Vercel Cron daily — protected by CRON_SECRET.
// Safety net for users who complete a payment but never hit /verify
// (closed the tab before the provider sent them back).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const start = Date.now()
  await cronitorPing('billing-reconcile', 'run')
  const supabase = createServiceClient()

  const { data: pending, error } = await supabase
    .from('profiles')
    .select('id, pending_plan, pending_provider, dpo_transaction_ref, dpo_token_created_at')
    .not('pending_plan', 'is', null)
    .not('dpo_transaction_ref', 'is', null)
    .lt('dpo_token_created_at', new Date(Date.now() - MIN_AGE_MS).toISOString())
    .limit(200)

  if (error) {
    logError('cron.billing_reconcile.fetch_failed', error)
    await cronitorPing('billing-reconcile', 'fail')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!pending?.length) {
    log('cron.billing_reconcile.none_pending')
    await cronitorPing('billing-reconcile', 'complete')
    return NextResponse.json({ upgraded: 0, cleared: 0 })
  }

  let upgraded = 0
  let cleared  = 0

  for (const profile of pending) {
    try {
      // Confirmed with the provider that started it, not the one new payments go to.
      const provider = providerById(profile.pending_provider)
      const { success } = await provider.verify(profile.dpo_transaction_ref!)

      if (success) {
        await confirmPlanUpgrade(supabase, profile.id, profile.pending_plan as PaidPlan, profile.dpo_transaction_ref!)
        upgraded++
        log('cron.billing_reconcile.upgraded', { userId: profile.id, provider: provider.id })
        continue
      }

      const tokenAge = Date.now() - new Date(profile.dpo_token_created_at!).getTime()
      if (tokenAge > provider.ttlMs + GRACE_MS) {
        // Past the provider's own time limit and still failing verification —
        // clear it so the user can retry checkout cleanly.
        await supabase
          .from('profiles')
          .update({ pending_plan: null, pending_months: null, pending_provider: null, pending_currency: null, dpo_transaction_ref: null, dpo_token_created_at: null })
          .eq('id', profile.id)
        cleared++
        log('cron.billing_reconcile.cleared_abandoned', { userId: profile.id, provider: provider.id })
      }
      // else: still within the time limit and not yet confirmed — leave as-is,
      // re-checked on the next run.
    } catch (err: any) {
      logError('cron.billing_reconcile.profile_failed', err, { userId: profile.id })
    }
  }

  log('cron.billing_reconcile.complete', { upgraded, cleared, durationMs: Date.now() - start })
  await cronitorPing('billing-reconcile', 'complete')
  return NextResponse.json({ upgraded, cleared })
  } catch (err: any) {
    logError('cron.billing_reconcile.unhandled', err)
    await cronitorPing('billing-reconcile', 'fail')
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
