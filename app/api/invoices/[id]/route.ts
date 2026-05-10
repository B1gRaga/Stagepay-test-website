import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripTags } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const
const ALLOWED_FIELDS = [
  'status', 'client_id', 'client_name', 'client_email', 'client_phone',
  'client_address', 'client_vat', 'project', 'notes', 'issue_date',
  'due_date', 'currency', 'vat_rate', 'deposit_amount',
] as const

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice: data })
}

// PATCH /api/invoices/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  if (body.vat_rate !== undefined) {
    const vat = Number(body.vat_rate)
    if (isNaN(vat) || vat < 0 || vat > 100) {
      return NextResponse.json({ error: 'vat_rate must be between 0 and 100' }, { status: 400 })
    }
  }

  const TEXT_FIELDS = new Set(['client_name', 'project', 'notes', 'client_address', 'client_email', 'client_phone', 'client_vat'])

  const { items, ...rest } = body
  const fields = Object.fromEntries(
    ALLOWED_FIELDS.filter(k => rest[k] !== undefined).map(k => [
      k,
      TEXT_FIELDS.has(k) && typeof rest[k] === 'string' ? stripTags(rest[k]) : rest[k],
    ])
  )

  // Recalculate totals when items are being updated
  if (Array.isArray(items)) {
    for (const item of items) {
      if (!item.description?.toString().trim()) {
        return NextResponse.json({ error: 'Each line item must have a description' }, { status: 400 })
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json({ error: 'Line item quantity must be greater than 0' }, { status: 400 })
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        return NextResponse.json({ error: 'Line item unit price cannot be negative' }, { status: 400 })
      }
    }

    const subtotal       = items.reduce((s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price, 0)
    const vat_rate       = typeof fields.vat_rate === 'number' ? fields.vat_rate : 14
    const deposit_amount = typeof fields.deposit_amount === 'number' ? fields.deposit_amount : 0

    if (deposit_amount < 0) {
      return NextResponse.json({ error: 'deposit_amount cannot be negative' }, { status: 400 })
    }
    if (deposit_amount > subtotal + subtotal * (vat_rate / 100)) {
      return NextResponse.json({ error: 'deposit_amount cannot exceed the invoice total' }, { status: 400 })
    }

    fields.vat_amount = subtotal * (vat_rate / 100)
    fields.subtotal   = subtotal
    fields.total      = subtotal + (fields.vat_amount as number) - deposit_amount

    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    const { error: itemsErr } = await supabase.from('invoice_items').insert(
      items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
        invoice_id:  id,
        user_id:     user.id,
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unit_price,
        sort_order:  idx,
      }))
    )
    if (itemsErr) return NextResponse.json({ error: 'Failed to update line items' }, { status: 500 })
  }

  if (Object.keys(fields).length === 0 && !Array.isArray(items)) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if (Object.keys(fields).length > 0) {
    const { data, error } = await supabase
      .from('invoices')
      .update(fields)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, invoice_items(*)')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    return NextResponse.json({ invoice: data })
  }

  // Items-only update: fetch and return current state
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

// DELETE /api/invoices/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  return NextResponse.json({ success: true })
}
