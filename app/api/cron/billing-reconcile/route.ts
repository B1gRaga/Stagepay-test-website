import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'
import { verifyPaymentToken, confirmPlanUpgrade, type DpoPlan } from '@/lib/dpo'

export const runtime = 'nodejs'
export const maxDuration = 60

// DPO tokens are valid for 30 minutes (PTL=30 in lib/dpo.ts createPaymentToken).
// Past that, a pending checkout is abandoned, not just slow.
const ABANDONED_AFTER_MS = 35 * 60 * 1000
// Give the redirect (/api/billing/verify) and webhook (/api/billing/callback)
// a head start before we step in — most payments are confirmed by one of those.
const MIN_AGE_MS = 5 * 60 * 1000

// Called by Vercel Cron daily — protected by CRON_SECRET.
// Safety net for users who complete a DPO payment but never hit /verify
// (closed the tab) and whose /callback webhook also never fires.
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
    .select('id, pending_plan, dpo_transaction_ref, dpo_token_created_at')
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
      const { success } = await verifyPaymentToken(profile.dpo_transaction_ref!)

      if (success) {
        await confirmPlanUpgrade(supabase, profile.id, profile.pending_plan as DpoPlan)
        upgraded++
        log('cron.billing_reconcile.upgraded', { userId: profile.id })
        continue
      }

      const tokenAge = Date.now() - new Date(profile.dpo_token_created_at!).getTime()
      if (tokenAge > ABANDONED_AFTER_MS) {
        // Token is past DPO's own TTL and still failing verification —
        // clear it so the user can retry checkout cleanly.
        await supabase
          .from('profiles')
          .update({ pending_plan: null, dpo_transaction_ref: null, dpo_token_created_at: null })
          .eq('id', profile.id)
        cleared++
        log('cron.billing_reconcile.cleared_abandoned', { userId: profile.id })
      }
      // else: still within the token TTL and not yet confirmed — leave as-is,
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
