import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, canManage } from '@/lib/account'
import { stripTags } from '@/lib/sanitize'

type Params = { params: Promise<{ id: string }> }

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'address', 'vat_number', 'notes'] as const

// PATCH /api/clients/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()

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
    .update(safe as import('@/lib/supabase/types').ClientUpdate)
    .eq('id', id)
    .eq('user_id', account.accountId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  return NextResponse.json({ client: data })
}

// DELETE /api/clients/[id] — soft delete: sets deleted_at, preserves invoice history.
// Goes through delete_client (migration 037): a plain update can't set
// deleted_at, because the read rule hides deleted rows. The function checks
// the business and the role itself as well.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can delete clients' }, { status: 403 })
  const supabase = await createClient()

  const { data: deleted, error } = await supabase.rpc('delete_client', { p_client_id: id })

  if (error) return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  if (!deleted) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
