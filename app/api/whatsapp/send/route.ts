import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const { supabase: _supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = _supabase as any

  if (!(await rateLimit(user.id, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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
  const barePhone = to_phone.replace(/^whatsapp:/, '').replace(/\D/g, '')
  if (barePhone.length < 7) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
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

  // Upload PDF to Supabase Storage so Twilio can fetch it as mediaUrl
  let pdfUrl: string | undefined
  if (pdf_base64) {
    try {
      const serviceClient = createServiceClient()
      const pdfBuffer = Buffer.from(pdf_base64, 'base64')
      if (pdfBuffer.length > MAX_PDF_BYTES) {
        return NextResponse.json({ error: 'PDF exceeds 10 MB limit' }, { status: 400 })
      }
      // Strip any path separators from the filename to prevent path traversal
      const rawName = filename || `${invoice_id}_${Date.now()}.pdf`
      const safeName = rawName.replace(/[/\\]/g, '_')
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

  const amountFormatted = total_amount
    ? `${currency || 'P'}${Number(total_amount).toLocaleString('en', { minimumFractionDigits: 2 })}`
    : ''

  try {
    const client = twilio(accountSid, authToken)
    const toFormatted = `whatsapp:+${barePhone}`

    const body = [
      `Hello from ${senderName} 👋`,
      ``,
      `Please find your invoice attached.`,
      invoice_number ? `📄 Invoice: ${invoice_number}` : '',
      amountFormatted   ? `💰 Amount:  ${amountFormatted}` : '',
      due_date          ? `📅 Due:     ${due_date}` : '',
      ``,
      `Thank you for your business!`,
    ].filter(Boolean).join('\n')

    const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID
    const msgParams: any = { from, to: toFormatted }

    if (templateSid) {
      // Use approved Content Template (works outside the 24-hour messaging window)
      msgParams.contentSid = templateSid
      msgParams.contentVariables = JSON.stringify({
        '1': senderName,
        '2': invoice_number || '',
        '3': amountFormatted,
        '4': due_date || 'upon receipt',
        '5': pdfUrl || '',
      })
    } else {
      // Free-form body — only works within 24 hours of recipient messaging first
      msgParams.body = body
      if (pdfUrl) msgParams.mediaUrl = [pdfUrl]
    }

    await client.messages.create(msgParams)

    // Record the send on the invoice
    const { error: statusErr } = await supabase
      .from('invoices')
      .update({ status: invoice.status === 'draft' ? 'sent' : invoice.status })
      .eq('id', invoice_id)
    if (statusErr) console.error('[WhatsApp] invoice status update failed:', statusErr.message)

    return NextResponse.json({ success: true })
  } catch(err: any) {
    const msg = err?.message || 'Failed to send WhatsApp message'
    console.error('[WhatsApp] Twilio error:', msg, 'code:', err?.code, 'status:', err?.status)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
