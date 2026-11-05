import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { stripTags } from '@/lib/sanitize'
import { cents, balanceDue, todayIso } from '@/lib/payments'

type Params = { params: Promise<{ id: string }> }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function loadInvoice(id: string, accountId: string) {
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, total, invoice_payments(id, amount, paid_on, note, created_at)')
    .eq('id', id)
    .eq('user_id', accountId)
    .single()
  return { supabase, invoice }
}

function sorted<T extends { paid_on: string; created_at: string }>(list: T[]) {
  return [...list].sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.created_at.localeCompare(b.created_at))
}

// POST /api/invoices/[id]/payments: record money received against an invoice.
// When the payments reach the total, the invoice becomes paid.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { supabase, invoice } = await loadInvoice(id, account.accountId)
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
    return NextResponse.json({ error: 'Payments can be recorded on sent or late invoices only' }, { status: 400 })
  }

  let body: { amount?: unknown; paid_on?: unknown; note?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const amount  = cents(Number(body.amount))
  const balance = balanceDue(invoice.total, invoice.invoice_payments)
  if (!(amount > 0)) return NextResponse.json({ error: 'Enter an amount above zero' }, { status: 400 })
  if (amount > balance) return NextResponse.json({ error: `That's more than the ${balance.toFixed(2)} still owed` }, { status: 400 })

  const today   = todayIso()
  const paid_on = typeof body.paid_on === 'string' && DATE_RE.test(body.paid_on) ? body.paid_on : today
  if (paid_on > today) return NextResponse.json({ error: 'The payment date can’t be in the future' }, { status: 400 })
  const note = typeof body.note === 'string' && body.note.trim() ? stripTags(body.note.trim()).slice(0, 60) : null

  const { data: payment, error } = await supabase
    .from('invoice_payments')
    .insert({ invoice_id: id, user_id: account.accountId, amount, paid_on, note })
    .select('id, amount, paid_on, note, created_at')
    .single()
  if (error || !payment) return NextResponse.json({ error: 'Failed to record the payment' }, { status: 500 })

  let status: string = invoice.status
  if (amount >= balance) {
    const { error: upErr } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', id)
      .eq('user_id', account.accountId)
    if (!upErr) status = 'paid'
  }

  return NextResponse.json({ payments: sorted([...invoice.invoice_payments, payment]), status })
}

// DELETE /api/invoices/[id]/payments?payment=<id>: remove a payment recorded by
// mistake. Paid invoices are final, so their payments stay.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const paymentId = req.nextUrl.searchParams.get('payment')
  if (!paymentId) return NextResponse.json({ error: 'Missing payment' }, { status: 400 })

  const { supabase, invoice } = await loadInvoice(id, account.accountId)
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'This invoice is paid, so its payments are final' }, { status: 400 })

  const { error } = await supabase
    .from('invoice_payments')
    .delete()
    .eq('id', paymentId)
    .eq('invoice_id', id)
  if (error) return NextResponse.json({ error: 'Failed to remove the payment' }, { status: 500 })

  return NextResponse.json({ payments: sorted(invoice.invoice_payments.filter(p => p.id !== paymentId)), status: invoice.status })
}
