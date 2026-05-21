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

  const start = Date.now()
  await cronitorPing('subscription-expiry', 'run')
  const supabase = createServiceClient() 
  // Find all non-free users whose subscription has expired
  const { data: expired, error } = await supabase
    .from('profiles')
    .select('id, plan, subscription_expires_at')
    .neq('plan', 'free')
    .lt('subscription_expires_at', new Date().toISOString())

  if (error) {
    logError('cron.subscription_expiry.fetch_failed', error)
    await cronitorPing('subscription-expiry', 'fail')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!expired?.length) {
    log('cron.subscription_expiry.none_expired')
    await cronitorPing('subscription-expiry', 'complete')
    return NextResponse.json({ downgraded: 0, message: 'No expired subscriptions' })
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

  log('cron.subscription_expiry.complete', { downgraded: ids.length, durationMs: Date.now() - start })
  await cronitorPing('subscription-expiry', 'complete')
  return NextResponse.json({ downgraded: ids.length })
}
