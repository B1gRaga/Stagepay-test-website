import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { resolveAccount, accountProfileClient } from '@/lib/account'
import { Resend } from 'resend'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { withRetry } from '@/lib/retry'
import { invoiceEmail } from '@/lib/emails/invoice'
import { scheduleRemindersOnSend } from '@/lib/reminder-schedule'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(req: NextRequest) {
  const { supabase: _supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = _supabase 
  const account = await resolveAccount(supabase, user.id)
  if (!(await rateLimit(account.userId, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let invoice_id: string, to_email: string, custom_body: string | undefined, paid_stamp: boolean
  try {
    const body = await req.json()
    invoice_id  = body.invoice_id
    to_email    = body.to_email
    custom_body = body.custom_body
    paid_stamp  = !!body.paid_stamp
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!invoice_id! || !to_email!) {
    return NextResponse.json({ error: 'invoice_id and to_email are required' }, { status: 400 })
  }
  if (!EMAIL_RE.test(to_email!)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', invoice_id).eq('user_id', account.accountId).single(),
    (await accountProfileClient(account)).from('profiles').select('*').eq('id', account.accountId).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const senderName = escapeHtml(profile?.firm_name || profile?.name || 'Your service provider')
  const invoiceNum = escapeHtml(invoice.invoice_number)
  const sym        = escapeHtml(invoice.currency || 'P')
  const total      = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
  // The email body names the business in its own words; the sender line and
  // subject keep using the values above.
  const deposit = Number(invoice.deposit_amount) || 0
  const { html, text } = invoiceEmail({
    senderName: profile?.firm_name || profile?.name || 'Your service provider',
    profile,
    invoice,
    amount: `${invoice.currency || 'P'}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`,
    kind: paid_stamp ? 'receipt' : custom_body ? 'custom' : 'invoice',
    message: custom_body,
    depositText: !paid_stamp && deposit > 0 ? `A deposit of ${invoice.currency || 'P'}${deposit.toLocaleString('en', { minimumFractionDigits: 2 })} is due now.` : undefined,
  })

  const fromAddress = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')
  const subject     = paid_stamp
    ? `Payment Confirmation: Invoice ${invoiceNum}`
    : custom_body
    ? `Payment reminder: Invoice ${invoiceNum}`
    : `Invoice ${invoiceNum} – ${total}`

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {}, { showPaidStamp: paid_stamp })

    const resend = new Resend(apiKey)
    await withRetry(() => resend.emails.send({
      from:    `${senderName} via StagePay <${fromAddress}>`,
      to:      [to_email],
      subject,
      html,
      text,
      attachments: [{ filename: `${invoiceNum}.pdf`, content: pdfBuffer }],
    }))

    const { error: statusErr } = await supabase
      .from('invoices')
      .update({
        email_sent_at: new Date().toISOString(),
        email_to:      to_email,
        status:        invoice.status === 'draft' ? 'sent' : invoice.status,
      })
      .eq('id', invoice_id)

    if (statusErr) console.error('[Email] invoice status update failed:', statusErr.message)
    else if (invoice.status === 'draft') await scheduleRemindersOnSend(account.accountId, invoice_id, account.userId)

    return NextResponse.json({ success: true })
  } catch(err: any) {
    const msg = err?.message || 'Failed to send email'
    console.error('[Email] send error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
