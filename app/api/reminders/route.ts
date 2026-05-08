import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_CHANNELS = ['whatsapp', 'email'] as const

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
  if (error) return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  return NextResponse.json({ reminders: data })
}

// POST /api/reminders — schedule a reminder
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

  if (!body.invoice_id) {
    return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
  }

  const channel = (body.channel as string) ?? 'whatsapp'
  if (!VALID_CHANNELS.includes(channel as typeof VALID_CHANNELS[number])) {
    return NextResponse.json({ error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 })
  }

  if (body.days_after_due !== undefined && (typeof body.days_after_due !== 'number' || body.days_after_due < 0)) {
    return NextResponse.json({ error: 'days_after_due must be a non-negative number' }, { status: 400 })
  }

  if (!body.send_at || isNaN(Date.parse(body.send_at as string))) {
    return NextResponse.json({ error: 'send_at must be a valid date' }, { status: 400 })
  }

  // Reject past dates
  if (new Date(body.send_at as string) <= new Date()) {
    return NextResponse.json({ error: 'send_at must be a future date' }, { status: 400 })
  }

  // Verify invoice belongs to this user
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_phone, client_email, due_date')
    .eq('id', body.invoice_id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const recipient_phone = (body.recipient_phone as string | undefined) ?? invoice.client_phone
  const recipient_email = (body.recipient_email as string | undefined) ?? invoice.client_email

  // Validate recipient is present for the chosen channel
  if (channel === 'whatsapp' && !recipient_phone) {
    return NextResponse.json({ error: 'WhatsApp reminder requires a phone number. Add one to the invoice or provide recipient_phone.' }, { status: 400 })
  }
  if (channel === 'email' && !recipient_email) {
    return NextResponse.json({ error: 'Email reminder requires an email address. Add one to the invoice or provide recipient_email.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id:         user.id,
      invoice_id:      body.invoice_id,
      send_at:         body.send_at,
      days_after_due:  body.days_after_due ?? null,
      channel,
      recipient_phone,
      recipient_email,
      status:          'scheduled',
      message_preview: body.message_preview ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  return NextResponse.json({ reminder: data }, { status: 201 })
}
