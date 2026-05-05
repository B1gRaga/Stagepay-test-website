import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/reminders?invoice_id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const invoice_id = searchParams.get('invoice_id')

  let query = supabase
    .from('reminders')
    .select('*, invoices(invoice_number, client_name, total, currency)')
    .eq('user_id', user.id)
    .order('send_at')

  if (invoice_id) query = query.eq('invoice_id', invoice_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: data })
}

// POST /api/reminders — schedule a reminder
export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Verify invoice belongs to this user
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_phone, client_email, due_date')
    .eq('id', body.invoice_id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  // Auto-populate recipient from invoice if not provided
  const recipient_phone = body.recipient_phone ?? invoice.client_phone
  const recipient_email = body.recipient_email ?? invoice.client_email

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      invoice_id: body.invoice_id,
      send_at: body.send_at,
      days_after_due: body.days_after_due ?? null,
      channel: body.channel ?? 'whatsapp',
      recipient_phone,
      recipient_email,
      status: 'scheduled',
      message_preview: body.message_preview ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminder: data }, { status: 201 })
}
