import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import twilio from 'twilio'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient() as any

  // Fetch all reminders that are due and not yet sent
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`
      *,
      invoices (
        id, invoice_number, client_name, total, currency, due_date, status, user_id,
        invoice_items (description, quantity, unit_price)
      )
    `)
    .eq('status', 'scheduled')
    .lte('send_at', new Date().toISOString())
    .limit(50)

  if (error) {
    console.error('[Cron] Failed to fetch reminders:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!reminders?.length) {
    return NextResponse.json({ sent: 0, message: 'No reminders due' })
  }

  const results = await Promise.allSettled(reminders.map((r: any) => processReminder(supabase, r)))

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`[Cron] Reminders processed: ${sent} sent, ${failed} failed`)
  return NextResponse.json({ sent, failed })
}

async function processReminder(supabase: any, reminder: any) {
  const invoice = reminder.invoices
  if (!invoice) throw new Error(`No invoice for reminder ${reminder.id}`)

  // Fetch the sender profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name, email')
    .eq('id', invoice.user_id)
    .single()

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym        = invoice.currency || 'P'
  const amount     = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`

  try {
    if (reminder.channel === 'email' && reminder.recipient_email) {
      await sendReminderEmail(reminder, invoice, senderName, amount)
    } else if (reminder.channel === 'whatsapp' && reminder.recipient_phone) {
      await sendReminderWhatsApp(reminder, invoice, senderName, amount)
    } else {
      throw new Error(`Missing recipient for channel ${reminder.channel}`)
    }

    await supabase
      .from('reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reminder.id)
  } catch (err: any) {
    console.error(`[Cron] Reminder ${reminder.id} failed:`, err.message)
    await supabase
      .from('reminders')
      .update({ status: 'failed', error_message: err.message?.slice(0, 500) })
      .eq('id', reminder.id)
    throw err
  }
}

async function sendReminderEmail(reminder: any, invoice: any, senderName: string, amount: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Email not configured')

  const resend = new Resend(apiKey)
  const from   = (process.env.RESEND_FROM_EMAIL || 'invoices@stagepay.co.bw').replace(/\.$/, '')
  const body   = reminder.message_preview ||
    `This is a friendly reminder that invoice ${invoice.invoice_number} for ${amount} is outstanding.\n\nPlease arrange payment at your earliest convenience. If you have already paid, please disregard this message.\n\nThank you.`

  await resend.emails.send({
    from:    `${senderName} via StagePay <${from}>`,
    to:      [reminder.recipient_email],
    subject: `Payment reminder: Invoice ${invoice.invoice_number}`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;padding:32px">
      <p style="font-size:16px">Hello,</p>
      <div style="white-space:pre-wrap;line-height:1.6">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <p style="margin-top:24px;font-size:12px;color:#aaa">Sent via StagePay</p>
    </body></html>`,
  })
}

async function sendReminderWhatsApp(reminder: any, invoice: any, senderName: string, amount: string) {
  const accountSid  = process.env.TWILIO_ACCOUNT_SID
  const authToken   = process.env.TWILIO_AUTH_TOKEN
  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID
  const from        = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (!accountSid || !authToken) throw new Error('WhatsApp not configured')

  const barePhone  = reminder.recipient_phone.replace(/^whatsapp:/, '').replace(/\D/g, '')
  const to         = `whatsapp:+${barePhone}`
  const client     = twilio(accountSid, authToken)

  const msgParams: any = { from, to }

  if (templateSid) {
    msgParams.contentSid = templateSid
    msgParams.contentVariables = JSON.stringify({
      '1': senderName,
      '2': invoice.invoice_number || '',
      '3': amount,
      '4': invoice.due_date || 'upon receipt',
      '5': '',
    })
  } else {
    msgParams.body = reminder.message_preview ||
      `Hello! This is a reminder from ${senderName}.\n\nInvoice ${invoice.invoice_number} for ${amount} is outstanding.\n\nPlease arrange payment at your earliest convenience. Thank you!`
  }

  await client.messages.create(msgParams)
}
