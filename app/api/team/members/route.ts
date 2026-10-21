import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'

// The people on the team of the business being worked in. Anyone in the
// business can see who's on it; only the owner gets the invite links.
export async function GET() {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('owner_id', account.accountId)
    .maybeSingle()

  if (!team) return NextResponse.json({ members: [], teamId: null })

  const { data: members } = await supabase
    .from('team_members')
    .select('id, email, status, role, invited_at, joined_at, invite_token')
    .eq('team_id', team.id)
    .order('invited_at', { ascending: true })

  const isOwner = account.role === 'owner'
  return NextResponse.json({
    members: (members ?? []).map(m => (isOwner ? m : { ...m, invite_token: null })),
    teamId: team.id,
  })
}
