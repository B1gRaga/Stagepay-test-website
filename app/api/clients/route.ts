import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripTags } from '@/lib/sanitize'

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'address', 'vat_number', 'notes'] as const
type ClientField = typeof ALLOWED_FIELDS[number]

// GET /api/clients — returns only non-deleted clients
export async function GET() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name')

  if (error) return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  return NextResponse.json({ clients: data })
}

// POST /api/clients
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

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const safe = Object.fromEntries(
    ALLOWED_FIELDS.filter(k => body[k] !== undefined).map(k => [k, stripTags(body[k])])
  ) as Record<ClientField, unknown>

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...safe, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  return NextResponse.json({ client: data }, { status: 201 })
}
