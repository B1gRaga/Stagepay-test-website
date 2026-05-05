import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAny = supabase as any
  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabaseAny.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('user_id', user.id).single(),
    supabaseAny.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {})

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
