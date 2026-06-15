import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { token?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const service = createServiceClient()

  // Look up the pending invite
  const { data: member } = await service
    .from('team_members')
    .select('id, team_id, email, status')
    .eq('invite_token', body.token)
    .eq('status', 'pending')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  }

  // Check user isn't already in a team
  const { data: existing } = await service
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (existing?.team_id) {
    return NextResponse.json({ error: 'You are already a member of a team' }, { status: 409 })
  }

  // Accept the invite: link user to team, grant business plan
  await service
    .from('team_members')
    .update({
      user_id: user.id,
      status: 'active',
      invite_token: null,
      joined_at: new Date().toISOString(),
    })
    .eq('id', member.id)

  await service
    .from('profiles')
    .update({ team_id: member.team_id, plan: 'business' })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
