import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { balanceDue, todayIso, PAYMENT_METHODS } from '@/lib/payments'
import { stripTags } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }


// POST /api/invoices/[id]/paid-now { method, reference? }
// Someone paid at the counter: record the whole balance as received today,
// mark the invoice paid, and drop any reminders that were booked. One step,
// so a receipt can go out while they're still standing there.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()

  let body: { method?: unknown; reference?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const method = (PAYMENT_METHODS as readonly string[]).includes(String(body.method)) ? String(body.method) : null
  if (!method) return NextResponse.json({ error: `method must be one of: ${PAYMENT_METHODS.join(', ')}` }, { status: 400 })
  const reference = typeof body.reference === 'string' && body.reference.trim() ? stripTags(body.reference.trim()).slice(0, 40) : ''
  const note = (reference ? `${method} · ${reference}` : method).slice(0, 60)

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, total, invoice_payments(id, amount, paid_on, note, created_at)')
    .eq('id', id)
    .eq('user_id', account.accountId)
    .single()
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ status: 'paid', payments: invoice.invoice_payments, alreadyPaid: true })
  if (invoice.status === 'cancelled') return NextResponse.json({ error: 'This invoice was cancelled' }, { status: 400 })

  const balance = balanceDue(invoice.total, invoice.invoice_payments)
  let payments = invoice.invoice_payments
  if (balance > 0) {
    const { data: payment, error } = await supabase
      .from('invoice_payments')
      .insert({ invoice_id: id, user_id: account.accountId, amount: balance, paid_on: todayIso(), note })
      .select('id, amount, paid_on, note, created_at')
      .single()
    if (error || !payment) return NextResponse.json({ error: 'Failed to record the payment' }, { status: 500 })
    payments = [...payments, payment]
  }

  const { error: upErr } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id).eq('user_id', account.accountId)
  if (upErr) return NextResponse.json({ error: 'Payment recorded, but the invoice couldn’t be marked paid' }, { status: 500 })

  // Nothing left to chase.
  await supabase.from('reminders').delete().eq('invoice_id', id).eq('user_id', account.accountId).eq('status', 'scheduled')

  return NextResponse.json({ status: 'paid', payments })
}
