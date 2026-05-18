import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import twilio from 'twilio'

// POST /api/reminders/send-now
// Sends a reminder immediately (bypasses cron) and logs it as status='sent'.
// Used when toggling auto-reminders on an already-overdue invoice.
export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { invoice_id, channel, recipient_email, recipient_phone, days_after_due } = body as any

  if (!invoice_id) return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
  if (channel !== 'email' && channel !== 'whatsapp') {
    return NextResponse.json({ error: 'channel must be email or whatsapp' }, { status: 400 })
  }
  if (channel === 'email' && !recipient_email) {
    return NextResponse.json({ error: 'recipient_email required for email channel' }, { status: 400 })
  }
  if (channel === 'whatsapp' && !recipient_phone) {
    return NextResponse.json({ error: 'recipient_phone required for whatsapp channel' }, { status: 400 })
  }

  // Verify invoice ownership
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, total, currency, due_date, user_id')
    .eq('id', invoice_id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name, email')
    .eq('id', user.id)
    .single()

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym        = invoice.currency || 'P'
  const amount     = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
  const now        = new Date().toISOString()

  try {
    if (channel === 'email') {
      await sendEmail(invoice, senderName, amount, recipient_email)
    } else {
      await sendWhatsApp(invoice, senderName, amount, recipient_phone)
    }

    // Log the sent reminder
    const { data: reminder } = await supabase
      .from('reminders')
      .insert({
        user_id:         user.id,
        invoice_id,
        send_at:         now,
        days_after_due:  days_after_due ?? null,
        channel,
        recipient_email: channel === 'email'     ? recipient_email : null,
        recipient_phone: channel === 'whatsapp'  ? recipient_phone : null,
        status:          'sent',
        sent_at:         now,
      })
      .select()
      .single()

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (err: any) {
    console.error('[send-now] Failed:', err.message)
    return NextResponse.json({ error: err.message || 'Failed to send reminder' }, { status: 500 })
  }
}

async function sendEmail(invoice: any, senderName: string, amount: string, to: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Email not configured — RESEND_API_KEY missing')

  const resend = new Resend(apiKey)
  const from   = (process.env.RESEND_FROM_EMAIL || 'invoices@stagepay.co.bw').replace(/\.$/, '')
  const body   = `This is a friendly reminder that invoice ${invoice.invoice_number} for ${amount} is outstanding.\n\nPlease arrange payment at your earliest convenience. If you have already paid, please disregard this message.\n\nThank you.`

  await resend.emails.send({
    from:    `${senderName} via StagePay <${from}>`,
    to:      [to],
    subject: `Payment reminder: Invoice ${invoice.invoice_number}`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;padding:32px">
      <p style="font-size:16px">Hello,</p>
      <div style="white-space:pre-wrap;line-height:1.6">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <p style="margin-top:24px;font-size:12px;color:#aaa">Sent via StagePay</p>
    </body></html>`,
  })
}

async function sendWhatsApp(invoice: any, senderName: string, amount: string, phone: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
  if (!accountSid || !authToken) throw new Error('WhatsApp not configured')

  const barePhone = phone.replace(/^whatsapp:/, '').replace(/\D/g, '')
  const client    = twilio(accountSid, authToken)
  await client.messages.create({
    from,
    to:   `whatsapp:+${barePhone}`,
    body: `Hello! This is a reminder from ${senderName}.\n\nInvoice ${invoice.invoice_number} for ${amount} is outstanding.\n\nPlease arrange payment at your earliest convenience. Thank you!`,
  })
}
