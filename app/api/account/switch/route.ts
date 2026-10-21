import { NextRequest, NextResponse } from 'next/server'
import { createClient, getCachedUser } from '@/lib/supabase/server'

// POST /api/account/switch { accountId } — work in another business the person
// belongs to, or their own (their own id). The database only honours a team
// business while they're an active member and its owner is on Business
// (current_account_id, migrations 034–035), so this checks the same before saving.
export async function POST(req: NextRequest) {
  const user = await getCachedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { accountId?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const target = body.accountId
  if (!target) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const supabase = await createClient()

  if (target !== user.id) {
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, teams!inner(owner_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('teams.owner_id', target)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'You’re not on that business’s team' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ current_account_id: target === user.id ? null : target })
    .eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Couldn’t switch business' }, { status: 500 })

  // Confirm what the database now says, so a lapsed team plan is reported honestly.
  const { data: now } = await supabase.rpc('current_account_id')
  if (target !== user.id && now !== target) {
    return NextResponse.json({ error: 'That business’s Business plan has ended, so its team is paused' }, { status: 409 })
  }
  return NextResponse.json({ ok: true, accountId: now ?? user.id })
}
