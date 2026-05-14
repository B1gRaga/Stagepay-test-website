import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripTags, stripTagsOrNull } from '@/lib/sanitize'

const PAGE_SIZE = 50

// GET /api/invoices — list invoices for the authenticated user (paginated)
export async function GET(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data, total: count, page, page_size: PAGE_SIZE })
}

// POST /api/invoices — create a new invoice with its line items
export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { items = [] } = body as { items?: { description: string; quantity: number; unit_price: number }[] }

  // Validate line items
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

  // Validate VAT rate
  const vat_rate = Number(body.vat_rate ?? 14)
  if (isNaN(vat_rate) || vat_rate < 0 || vat_rate > 100) {
    return NextResponse.json({ error: 'vat_rate must be between 0 and 100' }, { status: 400 })
  }

  // Calculate totals
  const subtotal       = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const vat_amount     = subtotal * (vat_rate / 100)
  const deposit_amount = Number(body.deposit_amount ?? 0)

  if (deposit_amount < 0) {
    return NextResponse.json({ error: 'deposit_amount cannot be negative' }, { status: 400 })
  }
  if (deposit_amount > subtotal + vat_amount) {
    return NextResponse.json({ error: 'deposit_amount cannot exceed the invoice total' }, { status: 400 })
  }

  const total = subtotal + vat_amount - deposit_amount

  // Atomically generate invoice number via service-role client.
  // next_invoice_number is revoked from authenticated; only service_role may call it.
  const svcClient = createServiceClient() as any
  const { data: invoiceNumber, error: numErr } = await svcClient.rpc('next_invoice_number', { p_user_id: user.id })
  if (numErr || !invoiceNumber) {
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      user_id:        user.id,
      invoice_number: invoiceNumber,
      status:         'draft',
      client_id:      body.client_id ?? null,
      client_name:    stripTags(body.client_name),
      client_email:   stripTagsOrNull(body.client_email),
      client_phone:   stripTagsOrNull(body.client_phone),
      client_address: stripTagsOrNull(body.client_address),
      client_vat:     stripTagsOrNull(body.client_vat),
      project:        stripTagsOrNull(body.project),
      notes:          stripTagsOrNull(body.notes),
      issue_date:     body.issue_date ?? new Date().toISOString().split('T')[0],
      due_date:       body.due_date ?? null,
      subtotal,
      vat_rate,
      vat_amount,
      deposit_amount,
      total,
      currency:       body.currency ?? 'P',
    })
    .select()
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('invoice_items').insert(
      items.map((item, idx) => ({
        invoice_id:  invoice.id,
        user_id:     user.id,
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unit_price,
        sort_order:  idx,
      }))
    )
    if (itemsErr) {
      // Roll back: delete the invoice we just created
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json({ error: 'Failed to save line items: ' + itemsErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
