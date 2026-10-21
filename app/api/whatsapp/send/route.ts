import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, createServiceClient } from '@/lib/supabase/server'
import { resolveAccount, accountProfileClient } from '@/lib/account'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'
import { sendWhatsApp, isWhatsAppConfigured } from '@/lib/whatsapp'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const { supabase: _supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = _supabase 
  const account = await resolveAccount(supabase, user.id)
  if (!(await rateLimit(account.userId, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let invoice_id: string, to_phone: string, pdf_base64: string | undefined
  let invoice_number: string | undefined, client_name: string | undefined
  let total_amount: number | undefined, currency: string | undefined, due_date: string | undefined
  let custom_body: string | undefined
  try {
    const body = await req.json()
    invoice_id     = body.invoice_id
    to_phone       = body.to_phone
    pdf_base64     = body.pdf_base64
    invoice_number = body.invoice_number
    client_name    = body.client_name
    total_amount   = body.total_amount
    currency       = body.currency
    due_date       = body.due_date
    custom_body    = typeof body.custom_body === 'string' ? body.custom_body.slice(0, 4000) : undefined
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

  // Fetch the full invoice from the DB — never use client-supplied values
  // for message content (invoice_number, total, etc.) as they are
  // attacker-controlled and bypass the ownership check.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, invoice_number, client_name, total, currency, due_date, public_token')
    .eq('id', invoice_id)
    .eq('user_id', account.accountId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: profile } = await (await accountProfileClient(account))
    .from('profiles')
    .select('firm_name, name')
    .eq('id', account.accountId)
    .single()

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 })
  }

  const senderName = profile?.firm_name || profile?.name || 'Your service provider'

  // Upload PDF to Supabase Storage so Meta can fetch it as a document link
  let pdfUrl: string | undefined
  if (pdf_base64) {
    try {
      const serviceClient = createServiceClient()
      const pdfBuffer = Buffer.from(pdf_base64, 'base64')
      if (pdfBuffer.length > MAX_PDF_BYTES) {
        return NextResponse.json({ error: 'PDF exceeds 10 MB limit' }, { status: 400 })
      }
      // Storage key is always server-generated — never derived from the
      // client-supplied filename, so there's no attacker-controlled input
      // anywhere near the storage path.
      const storagePath = `${account.accountId}/${invoice_id}_${Date.now()}.pdf`

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

  // Use DB values for message content — ignore client-supplied fields
  const dbInvoiceNumber = invoice.invoice_number || ''
  const dbTotal         = invoice.total
  const dbCurrency      = invoice.currency || 'P'
  const dbDueDate       = invoice.due_date || ''

  const amountFormatted = dbTotal != null
    ? `${dbCurrency}${Number(dbTotal).toLocaleString('en', { minimumFractionDigits: 2 })}`
    : ''

  const appUrl      = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const invoiceLink = appUrl && invoice.public_token ? `${appUrl}/invoice/${invoice.public_token}` : ''

  try {
    const body = custom_body || [
      `Hello from ${senderName} 👋`,
      ``,
      pdfUrl ? `Please find your invoice attached.` : `Here is your invoice.`,
      dbInvoiceNumber ? `📄 Invoice: ${dbInvoiceNumber}` : '',
      amountFormatted ? `💰 Amount:  ${amountFormatted}` : '',
      dbDueDate       ? `📅 Due:     ${dbDueDate}` : '',
      invoiceLink     ? `🔗 View:    ${invoiceLink}` : '',
      ``,
      `Thank you for your business!`,
    ].filter(Boolean).join('\n')

    // Business-initiated invoice sends need an approved template to deliver
    // outside the 24h window. Custom bodies (paid receipts, composed
    // messages) can't fit a template, so they go as free-form text.
    const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE
    const template = templateName && !custom_body
      ? { name: templateName, params: [senderName, dbInvoiceNumber, amountFormatted, dbDueDate || 'upon receipt', invoiceLink || appUrl] }
      : null

    await sendWhatsApp(barePhone, { text: body, template, documentUrl: pdfUrl })

    // Record the send on the invoice
    const { error: statusErr } = await supabase
      .from('invoices')
      .update({ status: invoice.status === 'draft' ? 'sent' : invoice.status })
      .eq('id', invoice_id)
    if (statusErr) console.error('[WhatsApp] invoice status update failed:', statusErr.message)

    return NextResponse.json({ success: true })
  } catch(err: any) {
    const msg = err?.message || 'Failed to send WhatsApp message'
    console.error('[WhatsApp] send error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
