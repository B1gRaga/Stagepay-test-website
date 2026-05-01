import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoice_id, to_phone } = await req.json()
  if (!invoice_id || !to_phone) {
    return NextResponse.json({ error: 'invoice_id and to_phone are required' }, { status: 400 })
  }

  // Verify invoice belongs to user
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', invoice_id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name')
    .eq('id', user.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stagepay.co.bw'
  const invoiceLink = `${appUrl}/invoice/${invoice.public_token}`
  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym = invoice.currency || 'P'
  const total = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`

  const message = [
    `Hello,`,
    ``,
    `${senderName} has sent you invoice ${invoice.invoice_number} for *${total}*.`,
    invoice.due_date ? `Payment is due by *${invoice.due_date}*.` : null,
    ``,
    `View and download your invoice here:`,
    invoiceLink,
    ``,
    `Sent via StagePay`,
  ].filter(l => l !== null).join('\n')

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
  }

  try {
    const client = twilio(accountSid, authToken)

    const toFormatted = to_phone.startsWith('whatsapp:') ? to_phone : `whatsapp:${to_phone}`

    await client.messages.create({ from, to: toFormatted, body: message })

    // Record the send on the invoice
    await supabase
      .from('invoices')
      .update({
        whatsapp_sent_at: new Date().toISOString(),
        whatsapp_to: to_phone,
        status: invoice.status === 'draft' ? 'pending' : invoice.status,
      })
      .eq('id', invoice_id)

    return NextResponse.json({ success: true, message_preview: message })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
