import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createServiceClient } from '@/lib/supabase/server'
import { TEAMS_ENABLED } from '@/lib/teams'

// Joining a team adds its business to the person's list and opens it. Their
// own business, invoices and plan are untouched; the team's business runs on
// its owner's plan, so nothing about the person's plan changes.
export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!TEAMS_ENABLED) return NextResponse.json({ error: 'Team accounts aren’t open yet' }, { status: 403 })

  let body: { token?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const service = createServiceClient()

  // Look up the pending invite and whose business it is
  const { data: member } = await service
    .from('team_members')
    .select('id, team_id, email, status, teams!inner(owner_id, name)')
    .eq('invite_token', body.token)
    .eq('status', 'pending')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  }

  const team = member.teams as unknown as { owner_id: string; name: string }
  if (team.owner_id === user.id) {
    return NextResponse.json({ error: 'This is your own team' }, { status: 400 })
  }

  // Already on this team under another invite?
  const { data: existing } = await service
    .from('team_members')
    .select('id')
    .eq('team_id', member.team_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You’re already on this team' }, { status: 409 })
  }

  const { error: joinErr } = await service
    .from('team_members')
    .update({
      user_id: user.id,
      status: 'active',
      invite_token: null,
      joined_at: new Date().toISOString(),
    })
    .eq('id', member.id)
    .eq('status', 'pending')
  if (joinErr) return NextResponse.json({ error: 'Couldn’t join the team. Please try again.' }, { status: 500 })

  // Open the team's business; they can switch back to their own from the menu.
  await service.from('profiles').update({ current_account_id: team.owner_id }).eq('id', user.id)

  return NextResponse.json({ ok: true, business: team.name })
}
