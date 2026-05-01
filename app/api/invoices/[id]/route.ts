import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice: data })
}

// PATCH /api/invoices/[id] — update fields or mark as paid
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { items, ...fields } = body

  // Recalculate totals if items are being updated
  if (items) {
    const subtotal = items.reduce((sum: number, item: { quantity: number; unit_price: number }) =>
      sum + item.quantity * item.unit_price, 0)
    const vat_rate = fields.vat_rate ?? 14
    fields.vat_amount = subtotal * (vat_rate / 100)
    fields.subtotal = subtotal
    fields.total = subtotal + fields.vat_amount - (fields.deposit_amount ?? 0)

    // Replace all line items
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    await supabase.from('invoice_items').insert(
      items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
        invoice_id: id,
        user_id: user.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: idx,
      }))
    )
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(fields)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, invoice_items(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

// DELETE /api/invoices/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
