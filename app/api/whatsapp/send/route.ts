import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { supabase: _supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = _supabase as any

  let invoice_id: string, to_phone: string, pdf_base64: string | undefined, filename: string | undefined
  let invoice_number: string | undefined, client_name: string | undefined
  let total_amount: number | undefined, currency: string | undefined, due_date: string | undefined
  try {
    const body = await req.json()
    invoice_id     = body.invoice_id
    to_phone       = body.to_phone
    pdf_base64     = body.pdf_base64
    filename       = body.filename
    invoice_number = body.invoice_number
    client_name    = body.client_name
    total_amount   = body.total_amount
    currency       = body.currency
    due_date       = body.due_date
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!invoice_id || !to_phone) {
    return NextResponse.json({ error: 'invoice_id and to_phone are required' }, { status: 400 })
  }

  // Verify invoice belongs to user (lightweight select — we use client-supplied values for message text)
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoice_id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name')
    .eq('id', user.id)
    .single()

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
  }

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const sym = currency || 'P'
  const totalFormatted = `${sym}${Number(total_amount ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`

  // Upload PDF to Supabase Storage so Twilio can fetch it as mediaUrl
  let pdfUrl: string | undefined
  if (pdf_base64) {
    try {
      const serviceClient = createServiceClient()
      const pdfBuffer = Buffer.from(pdf_base64, 'base64')
      const safeName = filename || `${invoice_id}_${Date.now()}.pdf`
      const storagePath = `${user.id}/${safeName}`

      const { error: uploadErr } = await serviceClient.storage
        .from('invoice-pdfs')
        .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: urlData } = serviceClient.storage
        .from('invoice-pdfs')
        .getPublicUrl(storagePath)

      pdfUrl = urlData.publicUrl
    } catch (uploadError: any) {
      console.error('PDF upload failed:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF: ' + uploadError.message }, { status: 500 })
    }
  }

  const message = [
    `Hello,`,
    ``,
    `${senderName} has sent you invoice ${invoice_number} for *${totalFormatted}*.`,
    due_date ? `Payment is due by *${due_date}*.` : null,
    ``,
    pdfUrl ? `Please find your invoice PDF attached.` : null,
    ``,
    `Sent via StagePay`,
  ].filter(l => l !== null).join('\n')

  try {
    const client = twilio(accountSid, authToken)
    const toFormatted = to_phone.startsWith('whatsapp:') ? to_phone : `whatsapp:${to_phone}`

    const msgParams: any = { from, to: toFormatted, body: message }
    if (pdfUrl) msgParams.mediaUrl = [pdfUrl]

    await client.messages.create(msgParams)

    // Record the send on the invoice
    await supabase
      .from('invoices')
      .update({ status: invoice.status === 'draft' ? 'sent' : invoice.status })
      .eq('id', invoice_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
