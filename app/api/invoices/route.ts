import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invoices — list all invoices for the authenticated user
export async function GET(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data })
}

// POST /api/invoices — create a new invoice with its line items
export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { items = [], ...invoiceData } = body

  // Generate invoice number: INV-YYYYMM-XXX
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const invoice_number = `INV-${ym}-${String((count || 0) + 1).padStart(3, '0')}`

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: { quantity: number; unit_price: number }) =>
    sum + item.quantity * item.unit_price, 0)
  const vat_rate = invoiceData.vat_rate ?? 14
  const vat_amount = subtotal * (vat_rate / 100)
  const deposit_amount = invoiceData.deposit_amount ?? 0
  const total = subtotal + vat_amount - deposit_amount

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      invoice_number,
      status: invoiceData.status ?? 'draft',
      client_id: invoiceData.client_id ?? null,
      client_name: invoiceData.client_name,
      client_email: invoiceData.client_email ?? null,
      client_phone: invoiceData.client_phone ?? null,
      client_address: invoiceData.client_address ?? null,
      client_vat: invoiceData.client_vat ?? null,
      project: invoiceData.project ?? null,
      notes: invoiceData.notes ?? null,
      issue_date: invoiceData.issue_date ?? new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date ?? null,
      subtotal,
      vat_rate,
      vat_amount,
      deposit_amount,
      total,
      currency: invoiceData.currency ?? 'P',
    })
    .select()
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Insert line items
  if (items.length > 0) {
    const { error: itemsErr } = await supabase.from('invoice_items').insert(
      items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
        invoice_id: invoice.id,
        user_id: user.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: idx,
      }))
    )
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
