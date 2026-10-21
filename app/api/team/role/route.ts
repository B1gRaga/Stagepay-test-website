import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { isTeamRole } from '@/lib/teams'

// PATCH /api/team/role { memberId, role } — the business owner changes someone's role.
export async function PATCH(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (account.role !== 'owner') {
    return NextResponse.json({ error: 'Only the business owner can change roles' }, { status: 403 })
  }

  let body: { memberId?: string; role?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  if (!isTeamRole(body.role)) return NextResponse.json({ error: 'Role must be admin or staff' }, { status: 400 })

  const service = createServiceClient()
  const { data: member } = await service
    .from('team_members')
    .select('id, teams!inner(owner_id)')
    .eq('id', body.memberId)
    .single()
  const team = member?.teams as unknown as { owner_id: string } | undefined
  if (!member || team?.owner_id !== account.userId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const { error } = await service.from('team_members').update({ role: body.role }).eq('id', body.memberId)
  if (error) return NextResponse.json({ error: 'Couldn’t change the role' }, { status: 500 })
  return NextResponse.json({ ok: true, role: body.role })
}
