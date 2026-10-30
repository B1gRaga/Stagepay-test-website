import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

// Today in Gaborone, as YYYY-MM-DD.
function gaboroneToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Gaborone' }).format(now)
}

// Called by Vercel Cron just after midnight in Gaborone — protected by CRON_SECRET.
// A sent invoice whose due date has passed becomes 'overdue', which is what the
// Late counts, the sidebar badge and the dashboard read. One whose due date was
// moved back into the future goes back to 'sent'.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await cronitorPing('mark-overdue', 'run')
    const supabase = createServiceClient()
    const today = gaboroneToday()

    const [late, back] = await Promise.all([
      supabase.from('invoices').update({ status: 'overdue' }).eq('status', 'sent').lt('due_date', today).select('id'),
      supabase.from('invoices').update({ status: 'sent' }).eq('status', 'overdue').gte('due_date', today).select('id'),
    ])
    if (late.error || back.error) {
      logError('cron.mark_overdue.update_failed', late.error ?? back.error)
      await cronitorPing('mark-overdue', 'fail')
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const result = { overdue: late.data?.length ?? 0, backToSent: back.data?.length ?? 0 }
    log('cron.mark_overdue.done', result)
    await cronitorPing('mark-overdue', 'complete')
    return NextResponse.json(result)
  } catch (err) {
    logError('cron.mark_overdue.failed', err)
    await cronitorPing('mark-overdue', 'fail')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
