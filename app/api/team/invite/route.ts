import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createClient, createServiceClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { TEAMS_ENABLED, isTeamRole } from '@/lib/teams'

const MAX_TEAM_SIZE = 5

export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!TEAMS_ENABLED) return NextResponse.json({ error: 'Team accounts aren’t open yet' }, { status: 403 })

  // Only the owner of the business being worked in manages its team.
  const account = await getAccount()
  if (account && account.role !== 'owner') {
    return NextResponse.json({ error: 'Only the business owner can invite people' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verify user is on Business plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, firm_name, team_id')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'business') {
    return NextResponse.json({ error: 'Team members require the Business plan' }, { status: 403 })
  }

  let body: { email?: string; role?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  if (body.role !== undefined && !isTeamRole(body.role)) {
    return NextResponse.json({ error: 'Role must be admin or staff' }, { status: 400 })
  }
  const role = isTeamRole(body.role) ? body.role : 'staff'

  if (email === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  const service = createServiceClient()

  // Get or create the team. Members belong to someone else's team and can't invite into it.
  let teamId = profile.team_id as string | null
  if (teamId) {
    const { data: team } = await service.from('teams').select('owner_id').eq('id', teamId).single()
    if (team?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the team owner can invite people' }, { status: 403 })
    }
  }
  if (!teamId) {
    const { data: team, error: teamErr } = await service
      .from('teams')
      .insert({ owner_id: user.id, name: profile?.firm_name ?? 'My Team' })
      .select('id')
      .single()
    if (teamErr || !team) {
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }
    teamId = team.id
    // Link owner's profile to their own team
    await service.from('profiles').update({ team_id: teamId }).eq('id', user.id)
  }

  // Check current team size (active + pending, including owner)
  const { count } = await service
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)

  const totalWithOwner = (count ?? 0) + 1
  if (totalWithOwner >= MAX_TEAM_SIZE) {
    return NextResponse.json({ error: `Team is full (max ${MAX_TEAM_SIZE} members including owner)` }, { status: 400 })
  }

  // Someone who already joined keeps their place; re-inviting them must not reset it.
  const { data: joined } = await service
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()
  if (joined) {
    return NextResponse.json({ error: 'This person is already on your team' }, { status: 409 })
  }

  // Upsert invite (re-invite if already pending)
  const { data: member, error: memberErr } = await service
    .from('team_members')
    .upsert(
      { team_id: teamId, email, role, status: 'pending', invited_at: new Date().toISOString() },
      { onConflict: 'team_id,email', ignoreDuplicates: false }
    )
    .select('invite_token')
    .single()

  if (memberErr || !member) {
    if (memberErr?.code === '23505') {
      return NextResponse.json({ error: 'This email is already a team member' }, { status: 409 })
    }
    // P0001 = RAISE EXCEPTION from the team_members_size_guard trigger —
    // the DB-level backstop for the race the count check above can miss.
    if (memberErr?.code === 'P0001') {
      return NextResponse.json({ error: `Team is full (max ${MAX_TEAM_SIZE} members including owner)` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = `${origin}/join/${member.invite_token}`

  return NextResponse.json({ inviteUrl })
}
