import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { Resend } from 'resend'
import { reminderEmail } from '@/lib/emails/reminder'
import { sendWhatsApp as sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp'

// POST /api/reminders/send-now
// Sends a reminder immediately (bypasses cron) and logs it as status='sent'.
// Used when toggling auto-reminders on an already-overdue invoice.
export async function POST(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { invoice_id, channel, recipient_email, recipient_phone, days_after_due } = body as {
    invoice_id?: string; channel?: string; recipient_email?: string; recipient_phone?: string; days_after_due?: number
  }

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
    .select('id, invoice_number, client_name, total, currency, due_date, status, user_id, public_token')
    .eq('id', invoice_id)
    .eq('user_id', account.accountId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot send reminder for a paid or cancelled invoice' }, { status: 400 })
  }

  const { data: profile } = await (await accountProfileClient(account))
    .from('profiles')
    .select('firm_name, name, email, logo_url, invoice_theme, brand_color_primary, brand_color_header')
    .eq('id', account.accountId)
    .single()

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym        = invoice.currency || 'P'
  const amount     = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
  const now        = new Date().toISOString()

  try {
    if (channel === 'email') {
      await sendEmail(invoice, senderName, amount, recipient_email!, profile)
    } else {
      await sendWhatsApp(invoice, senderName, amount, recipient_phone!)
    }

    // Log the sent reminder
    const { data: reminder } = await supabase
      .from('reminders')
      .insert({
        user_id:         account.accountId,
        invoice_id,
        send_at:         now,
        days_after_due:  days_after_due ?? null,
        channel:         channel as import('@/lib/supabase/types').ReminderChannel,
        recipient_email: channel === 'email'     ? (recipient_email ?? null) : null,
        recipient_phone: channel === 'whatsapp'  ? (recipient_phone ?? null) : null,
        status:          'sent' as import('@/lib/supabase/types').ReminderStatus,
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

async function sendEmail(invoice: any, senderName: string, amount: string, to: string, profile: any) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Email not configured — RESEND_API_KEY missing')

  const resend = new Resend(apiKey)
  const from   = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')
  const { html, text } = reminderEmail({ senderName, profile, invoice, amount })

  await resend.emails.send({
    from:    `${senderName} via StagePay <${from}>`,
    to:      [to],
    subject: `Payment reminder: Invoice ${invoice.invoice_number}`,
    html,
    text,
  })
}

async function sendWhatsApp(invoice: any, senderName: string, amount: string, phone: string) {
  if (!isWhatsAppConfigured()) throw new Error('WhatsApp not configured')

  const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE
  await sendWhatsAppMessage(phone, {
    text:     `Hello! This is a reminder from ${senderName}.\n\nInvoice ${invoice.invoice_number} for ${amount} is outstanding.\n\nPlease arrange payment at your earliest convenience. Thank you!`,
    template: templateName ? { name: templateName, params: [senderName, invoice.invoice_number, amount] } : null,
  })
}
