import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripTags } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'address', 'vat_number', 'notes'] as const

// PATCH /api/clients/[id]
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

  const safe = Object.fromEntries(
    ALLOWED_FIELDS.filter(k => body[k] !== undefined).map(k => [k, stripTags(body[k])])
  )

  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .update(safe)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  return NextResponse.json({ client: data })
}

// DELETE /api/clients/[id] — soft delete: sets deleted_at, preserves invoice history
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  return NextResponse.json({ success: true })
}
