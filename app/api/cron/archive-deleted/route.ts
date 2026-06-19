import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const RETENTION_DAYS = 90

// Called by Vercel Cron weekly — protected by CRON_SECRET
// Hard-deletes clients that have been soft-deleted for over RETENTION_DAYS.
// Safe because invoices.client_id is ON DELETE SET NULL and invoices already
// store client_name/email/phone/address/vat redundantly for display.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const start = Date.now()
  const DEADLINE_MS = 50_000 // leave a buffer under maxDuration=60
  const BATCH_SIZE  = 500
  await cronitorPing('archive-deleted', 'run')
  const supabase = createServiceClient()
  const cutoff   = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString()

  let archived = 0

  while (Date.now() - start < DEADLINE_MS) {
    const { data: stale, error } = await supabase
      .from('clients')
      .select('id')
      .lt('deleted_at', cutoff)
      .limit(BATCH_SIZE)

    if (error) {
      logError('cron.archive_deleted.fetch_failed', error)
      await cronitorPing('archive-deleted', 'fail')
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!stale?.length) {
      if (archived === 0) log('cron.archive_deleted.none_due')
      break
    }

    const ids = stale.map((c: any) => c.id)
    const { error: deleteErr } = await supabase.from('clients').delete().in('id', ids)

    if (deleteErr) {
      logError('cron.archive_deleted.delete_failed', deleteErr, { count: ids.length })
      await cronitorPing('archive-deleted', 'fail')
      return NextResponse.json({ error: 'Failed to archive' }, { status: 500 })
    }

    archived += ids.length

    if (stale.length < BATCH_SIZE) break // queue drained
  }

  log('cron.archive_deleted.complete', { archived, durationMs: Date.now() - start })
  await cronitorPing('archive-deleted', 'complete')
  return NextResponse.json({ archived })
  } catch (err: any) {
    logError('cron.archive_deleted.unhandled', err)
    await cronitorPing('archive-deleted', 'fail')
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
