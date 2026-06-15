import { NextResponse } from 'next/server'
import { getCachedUser, createClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // Get the team owned by this user
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!team) return NextResponse.json({ members: [], teamId: null })

  const { data: members } = await supabase
    .from('team_members')
    .select('id, email, status, invited_at, joined_at, invite_token')
    .eq('team_id', team.id)
    .order('invited_at', { ascending: true })

  return NextResponse.json({ members: members ?? [], teamId: team.id })
}
