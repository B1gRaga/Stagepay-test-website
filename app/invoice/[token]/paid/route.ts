import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { stripTags } from '@/lib/sanitize'
import { paymentClaimEmail } from '@/lib/emails/payment-claim'

type Params = { params: Promise<{ token: string }> }

export const runtime = 'nodejs'

// "I've paid" from the client's invoice page. Mobile money to a personal
// wallet can't be seen by the app, so the client gives the reference from
// their SMS and the business confirms it. This never marks the invoice paid.
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!(await checkRateLimit(`paid-claim:${ip}`, 5, 10 * 60_000))) {
    return NextResponse.json({ error: 'Too many tries. Wait a few minutes and try again.' }, { status: 429 })
  }

  let reference: string
  try {
    const body = await req.json()
    reference = stripTags(body.reference).replace(/\s+/g, ' ')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (reference.length < 3 || reference.length > 60) {
    return NextResponse.json({ error: 'Enter the reference from your payment SMS.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, total, currency, status, user_id')
    .eq('public_token', token)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ success: true, alreadyPaid: true })
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    return NextResponse.json({ error: 'This invoice is not open for payment.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('invoices')
    .update({ payment_claimed_at: new Date().toISOString(), payment_claim_ref: reference })
    .eq('id', invoice.id)
  if (error) return NextResponse.json({ error: 'Couldn’t save that. Try again.' }, { status: 500 })

  // Tell the business. The claim is saved either way, and shows on the invoice in StagePay.
  const apiKey = process.env.RESEND_API_KEY
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', invoice.user_id).single()
  if (apiKey && profile?.email) {
    const amount = `${invoice.currency || 'P'}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
    const { html, text, subject } = paymentClaimEmail({ invoice, amount, reference })
    const from = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')
    try {
      const { error: mailErr } = await new Resend(apiKey).emails.send({ from: `StagePay <${from}>`, to: [profile.email], subject, html, text })
      if (mailErr) console.error('[PaidClaim] email failed:', mailErr.message)
    } catch (err) {
      console.error('[PaidClaim] email failed:', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ success: true })
}
