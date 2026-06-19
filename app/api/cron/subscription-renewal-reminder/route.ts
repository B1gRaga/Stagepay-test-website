import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'
import { Resend } from 'resend'
import { withRetry } from '@/lib/retry'

export const runtime = 'nodejs'
export const maxDuration = 60

const REMINDER_DAYS_BEFORE = 3

// Called by Vercel Cron daily — protected by CRON_SECRET.
// There's no auto-renewal (DPO integration here is one-off tokens only),
// so this is the safety net: warn paid users before they get silently
// downgraded by the subscription-expiry cron.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const start = Date.now()
  await cronitorPing('subscription-renewal-reminder', 'run')
  const supabase = createServiceClient()

  // A 24-hour window around "now + REMINDER_DAYS_BEFORE" so each profile's
  // fixed expiry timestamp falls into exactly one day's run.
  const windowStart = new Date(Date.now() + REMINDER_DAYS_BEFORE * 86_400_000)
  const windowEnd    = new Date(windowStart.getTime() + 86_400_000)

  const { data: expiringSoon, error } = await supabase
    .from('profiles')
    .select('id, email, name, firm_name, plan, subscription_expires_at')
    .neq('plan', 'free')
    .gte('subscription_expires_at', windowStart.toISOString())
    .lt('subscription_expires_at', windowEnd.toISOString())
    .limit(500)

  if (error) {
    logError('cron.renewal_reminder.fetch_failed', error)
    await cronitorPing('subscription-renewal-reminder', 'fail')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!expiringSoon?.length) {
    log('cron.renewal_reminder.none_due')
    await cronitorPing('subscription-renewal-reminder', 'complete')
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    log('cron.renewal_reminder.email_not_configured')
    await cronitorPing('subscription-renewal-reminder', 'complete')
    return NextResponse.json({ sent: 0, failed: 0, message: 'Email not configured' })
  }

  const resend = new Resend(apiKey)
  const from   = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')

  let sent   = 0
  let failed = 0

  for (const profile of expiringSoon) {
    if (!profile.email) { failed++; continue }
    try {
      const name = profile.firm_name || profile.name || 'there'
      await withRetry(() => resend.emails.send({
        from:    `StagePay <${from}>`,
        to:      [profile.email!],
        subject: `Your StagePay ${profile.plan} plan renews in ${REMINDER_DAYS_BEFORE} days`,
        html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;padding:32px">
          <p style="font-size:16px">Hi ${name},</p>
          <p>Your StagePay <strong>${profile.plan}</strong> plan is set to expire on <strong>${new Date(profile.subscription_expires_at!).toLocaleDateString()}</strong>.</p>
          <p>Renew before then to keep uninterrupted access — log in and head to Settings &gt; Billing to renew.</p>
          <p style="margin-top:24px;font-size:12px;color:#aaa">Sent via StagePay</p>
        </body></html>`,
      }))
      sent++
    } catch (err: any) {
      logError('cron.renewal_reminder.send_failed', err, { userId: profile.id })
      failed++
    }
  }

  log('cron.renewal_reminder.complete', { sent, failed, durationMs: Date.now() - start })
  await cronitorPing('subscription-renewal-reminder', 'complete')
  return NextResponse.json({ sent, failed })
  } catch (err: any) {
    logError('cron.renewal_reminder.unhandled', err)
    await cronitorPing('subscription-renewal-reminder', 'fail')
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
