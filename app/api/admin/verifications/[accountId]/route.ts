import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { stripTags } from '@/lib/sanitize'
import { isStagePayAdmin } from '@/lib/verification'
import { emailDecision } from '@/lib/emails/verification'

// POST /api/admin/verifications/<accountId> { decision: 'approve' | 'decline', note? }
// StagePay staff only (STAGEPAY_ADMIN_EMAILS). The owner is emailed the result.

type Params = { params: Promise<{ accountId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const email = (await headers()).get('x-user-email')
  if (!isStagePayAdmin(email)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { accountId } = await params

  let body: { decision?: unknown; note?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
  const approve = body.decision === 'approve'
  if (!approve && body.decision !== 'decline') return NextResponse.json({ error: 'decision must be approve or decline' }, { status: 400 })
  const note = typeof body.note === 'string' ? stripTags(body.note).trim().slice(0, 500) || null : null
  if (!approve && !note) return NextResponse.json({ error: 'Say why, so the business can fix it' }, { status: 400 })

  const svc = createServiceClient()
  const { data: row, error } = await svc.from('business_verifications')
    .update({ status: approve ? 'approved' : 'declined', reviewed_at: new Date().toISOString(), reviewed_by: email, decision_note: note })
    .eq('account_id', accountId)
    .select('status')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Couldn’t save the decision' }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: profile } = await svc.from('profiles').select('firm_name, name').eq('id', accountId).single()
  await emailDecision({ accountId, businessName: profile?.firm_name || profile?.name || 'Your business', approved: approve, note })
  return NextResponse.json({ status: row.status })
}
