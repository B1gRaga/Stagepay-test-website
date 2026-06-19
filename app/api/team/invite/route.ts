import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_TEAM_SIZE = 5

export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  let body: { email?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  if (email === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  const service = createServiceClient()

  // Get or create the team
  let teamId = profile.team_id as string | null
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

  // Upsert invite (re-invite if already pending)
  const { data: member, error: memberErr } = await service
    .from('team_members')
    .upsert(
      { team_id: teamId, email, status: 'pending', invited_at: new Date().toISOString() },
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
