import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount, canManage } from '@/lib/account'

type Params = { params: Promise<{ id: string }> }

// POST /api/clients/[id]/restore — the Undo after deleting a client. Works for
// a day after the delete (restore_client, migration 037).
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can restore clients' }, { status: 403 })
  const supabase = await createClient()

  const { data: restored, error } = await supabase.rpc('restore_client', { p_client_id: id })

  if (error) return NextResponse.json({ error: 'Failed to restore client' }, { status: 500 })
  if (!restored) return NextResponse.json({ error: 'This client can no longer be restored' }, { status: 404 })
  return NextResponse.json({ success: true })
}
