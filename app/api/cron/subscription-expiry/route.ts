import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const start = Date.now()
  const DEADLINE_MS = 50_000 // leave a buffer under maxDuration=60
  const BATCH_SIZE  = 500
  await cronitorPing('subscription-expiry', 'run')
  const supabase = createServiceClient()

  let downgraded = 0

  // Loop until the queue is drained or we run out of time budget — an
  // unbounded query here could time out the function as the user base grows.
  while (Date.now() - start < DEADLINE_MS) {
    const { data: expired, error } = await supabase
      .from('profiles')
      .select('id, plan, subscription_expires_at')
      .neq('plan', 'free')
      .lt('subscription_expires_at', new Date().toISOString())
      .limit(BATCH_SIZE)

    if (error) {
      logError('cron.subscription_expiry.fetch_failed', error)
      await cronitorPing('subscription-expiry', 'fail')
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!expired?.length) {
      if (downgraded === 0) log('cron.subscription_expiry.none_expired')
      break
    }

    const ids = expired.map((p: any) => p.id)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ plan: 'free', subscription_expires_at: null })
      .in('id', ids)

    if (updateErr) {
      logError('cron.subscription_expiry.downgrade_failed', updateErr, { count: ids.length })
      await cronitorPing('subscription-expiry', 'fail')
      return NextResponse.json({ error: 'Failed to downgrade' }, { status: 500 })
    }

    downgraded += ids.length

    if (expired.length < BATCH_SIZE) break // queue drained
  }

  log('cron.subscription_expiry.complete', { downgraded, durationMs: Date.now() - start })
  await cronitorPing('subscription-expiry', 'complete')
  return NextResponse.json({ downgraded })
  } catch (err: any) {
    logError('cron.subscription_expiry.unhandled', err)
    await cronitorPing('subscription-expiry', 'fail')
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
