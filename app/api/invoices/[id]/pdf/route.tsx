import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()

  const { searchParams } = new URL(req.url)
  const showPaidStamp = searchParams.get('paid') === 'true'
  const inline        = searchParams.get('view') === 'true'

  const supabaseAny = supabase
  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabaseAny.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('user_id', account.accountId).single(),
    (await accountProfileClient(account)).from('profiles').select('*').eq('id', account.accountId).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buffer = await generateInvoicePDF(invoice, invoice.invoice_items || [], profile || {}, { showPaidStamp })
    const disposition = inline
      ? `inline; filename="${invoice.invoice_number}.pdf"`
      : `attachment; filename="${invoice.invoice_number}.pdf"`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': disposition,
      },
    })
  } catch (err: any) {
    console.error('[PDF] generation failed:', err?.message)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
