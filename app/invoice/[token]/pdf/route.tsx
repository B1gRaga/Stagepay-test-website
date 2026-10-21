import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

type Params = { params: Promise<{ token: string }> }

// The client's download is the same PDF the business sends: their template,
// colours, logo and payment details. Only the fields the PDF prints are read.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('public_token', token)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name, email, phone, address, city, country, vat_number, logo_url, invoice_theme, brand_color_primary, brand_color_header, payment_methods, tax_label')
    .eq('id', invoice.user_id)
    .single()

  try {
    const buffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {}, { showPaidStamp: invoice.status === 'paid' })
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('[public PDF] generation failed:', err?.message)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
