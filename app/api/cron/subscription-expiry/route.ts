import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient() as any

  // Find all non-free users whose subscription has expired
  const { data: expired, error } = await supabase
    .from('profiles')
    .select('id, plan, subscription_expires_at')
    .neq('plan', 'free')
    .lt('subscription_expires_at', new Date().toISOString())

  if (error) {
    console.error('[Cron] Failed to fetch expired subscriptions:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!expired?.length) {
    return NextResponse.json({ downgraded: 0, message: 'No expired subscriptions' })
  }

  const ids = expired.map((p: any) => p.id)

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ plan: 'free', subscription_expires_at: null })
    .in('id', ids)

  if (updateErr) {
    console.error('[Cron] Failed to downgrade expired subscriptions:', updateErr.message)
    return NextResponse.json({ error: 'Failed to downgrade' }, { status: 500 })
  }

  console.log(`[Cron] Downgraded ${ids.length} expired subscription(s) to free`)
  return NextResponse.json({ downgraded: ids.length })
}
