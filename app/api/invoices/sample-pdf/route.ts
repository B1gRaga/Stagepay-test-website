import { NextRequest, NextResponse } from 'next/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { THEME_ORDER } from '@/lib/invoice-themes'

// The Branding panel's preview: the business's own details, a sample client
// and items, in the template and colours being tried (not yet saved).
export async function GET(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams
  const hex = (v: string | null) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : null)
  const theme = THEME_ORDER.includes(q.get('theme') ?? '') ? q.get('theme')! : null

  const { data: profile } = await (await accountProfileClient(account))
    .from('profiles').select('*').eq('id', account.accountId).single()
  const p: Record<string, any> = profile || {}

  const rate = Number(p.default_vat_rate ?? 14)
  const items = [
    { description: 'Mathematics', quantity: 4, unit_price: 75, amount: 300 },
    { description: 'English', quantity: 4, unit_price: 75, amount: 300 },
    { description: 'Registration fee', quantity: 1, unit_price: 150, amount: 150 },
  ]
  const subtotal = 750
  const vat = Math.round(subtotal * rate) / 100
  const issue = new Date()
  const due = new Date(issue.getTime() + Number(p.default_due_days ?? 14) * 86_400_000)
  const invoice = {
    invoice_number: 'INV-SAMPLE', status: 'sent', currency: p.default_currency || 'P',
    issue_date: issue.toISOString().slice(0, 10), due_date: due.toISOString().slice(0, 10),
    client_name: 'Thato Mokobi', client_phone: '+267 72 123 456', project: 'Monthly tuition',
    subtotal, discount_amount: 0, vat_rate: rate, vat_amount: vat, total: subtotal + vat, deposit_amount: 0,
  }

  try {
    const buffer = await generateInvoicePDF(invoice, items, p, {
      theme: theme ?? p.invoice_theme,
      primaryColor: q.has('accent') ? hex(q.get('accent')) : p.brand_color_primary,
      headerColor: q.has('header') ? hex(q.get('header')) : p.brand_color_header,
    })
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline; filename="sample-invoice.pdf"',
      },
    })
  } catch (err: any) {
    console.error('[sample PDF] generation failed:', err?.message)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
