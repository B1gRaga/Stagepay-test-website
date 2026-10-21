import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createClient, createServiceClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'

export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only the owner of the business being worked in manages its team.
  const account = await getAccount()
  if (account && account.role !== 'owner') {
    return NextResponse.json({ error: 'Only the business owner can remove people' }, { status: 403 })
  }

  let body: { memberId?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

  const supabase = await createClient()

  // Verify the member belongs to a team owned by this user
  const { data: member } = await supabase
    .from('team_members')
    .select('id, user_id, team_id, teams!inner(owner_id)')
    .eq('id', body.memberId)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const team = member.teams as unknown as { owner_id: string }
  if (team.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()

  // Anyone working in this business right now goes back to their own.
  if (member.user_id) {
    await service
      .from('profiles')
      .update({ current_account_id: null })
      .eq('id', member.user_id)
      .eq('current_account_id', team.owner_id)
  }

  await service.from('team_members').delete().eq('id', body.memberId)

  return NextResponse.json({ ok: true })
}
