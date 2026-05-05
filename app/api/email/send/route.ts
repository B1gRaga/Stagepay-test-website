import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { rateLimit } from '@/lib/rate-limit'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const { supabase: _supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = _supabase as any

  if (!rateLimit(user.id, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let invoice_id: string, to_email: string
  try {
    const body = await req.json()
    invoice_id = body.invoice_id
    to_email   = body.to_email
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!invoice_id || !to_email) {
    return NextResponse.json({ error: 'invoice_id and to_email are required' }, { status: 400 })
  }
  if (!EMAIL_RE.test(to_email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', invoice_id).eq('user_id', user.id).single(),
    supabase.from('profiles').select('firm_name, name, email').eq('id', user.id).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym = invoice.currency || 'P'
  const total = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
  const dueLine = invoice.due_date
    ? `<p style="margin:0 0 8px">Payment is due by <strong>${invoice.due_date}</strong>.</p>`
    : ''

  const html = `
<!DOCTYPE html>
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
            <p style="margin:0 0 16px;font-size:16px">Hello,</p>
            <p style="margin:0 0 16px"><strong>${senderName}</strong> has sent you invoice <strong>${invoice.invoice_number}</strong> for <strong>${total}</strong>.</p>
            ${dueLine}
            <p style="margin:16px 0 0;color:#555">Please find your invoice attached as a PDF to this email.</p>
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

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {})

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: `${senderName} via StagePay <${fromAddress}>`,
      to: [to_email],
      subject: `Invoice ${invoice.invoice_number} – ${total}`,
      html,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    await supabase
      .from('invoices')
      .update({
        email_sent_at: new Date().toISOString(),
        email_to: to_email,
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
      })
      .eq('id', invoice_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
