import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

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
  const supabase = _supabase as any

  if (!(await rateLimit(user.id, 10, 60_000))) {
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
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', invoice_id).eq('user_id', user.id).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const senderName = escapeHtml(profile?.firm_name || profile?.name || 'Your service provider')
  const invoiceNum = escapeHtml(invoice.invoice_number)
  const sym        = escapeHtml(invoice.currency || 'P')
  const total      = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
  const dueLine    = invoice.due_date
    ? `<p style="margin:0 0 8px">Payment is due by <strong>${escapeHtml(invoice.due_date)}</strong>.</p>`
    : ''

  const paidBodyContent = `<p style="margin:0 0 16px;font-size:16px">Dear ${escapeHtml(invoice.client_name || 'Client')},</p>
       <p style="margin:0 0 16px">This is to confirm that invoice <strong>${invoiceNum}</strong> for <strong>${total}</strong> has been received and is marked as <strong style="color:#10B981">PAID</strong>.</p>
       <p style="margin:0 0 16px;color:#555">Please find the paid invoice attached for your records.</p>
       <p style="margin:0;color:#555">Thank you for your prompt payment.</p>`

  const bodyContent = paid_stamp
    ? paidBodyContent
    : custom_body
    ? `<p style="margin:0 0 16px;font-size:16px">Hello,</p>
       <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(custom_body)}</div>`
    : `<p style="margin:0 0 16px;font-size:16px">Hello,</p>
       <p style="margin:0 0 16px"><strong>${senderName}</strong> has sent you invoice <strong>${invoiceNum}</strong> for <strong>${total}</strong>.</p>
       ${dueLine}
       <p style="margin:16px 0 0;color:#555">Please find your invoice attached as a PDF to this email.</p>`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#111;padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:bold">StagePay</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#aaa">Sent via StagePay</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const fromAddress = (process.env.RESEND_FROM_EMAIL || 'invoices@stagepay.co.bw').replace(/\.$/, '')
  const subject     = paid_stamp
    ? `Payment Confirmation: Invoice ${invoiceNum}`
    : custom_body
    ? `Payment reminder: Invoice ${invoiceNum}`
    : `Invoice ${invoiceNum} – ${total}`

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {}, { showPaidStamp: paid_stamp })

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from:    `${senderName} via StagePay <${fromAddress}>`,
      to:      [to_email],
      subject,
      html,
      attachments: [{ filename: `${invoiceNum}.pdf`, content: pdfBuffer }],
    })

    const { error: statusErr } = await supabase
      .from('invoices')
      .update({
        email_sent_at: new Date().toISOString(),
        email_to:      to_email,
        status:        invoice.status === 'draft' ? 'sent' : invoice.status,
      })
      .eq('id', invoice_id)

    if (statusErr) console.error('[Email] invoice status update failed:', statusErr.message)

    return NextResponse.json({ success: true })
  } catch(err: any) {
    const msg = err?.message || 'Failed to send email'
    console.error('[Email] send error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
