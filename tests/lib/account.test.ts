import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getCachedUser: vi.fn(),
}))

import { resolveAccount, canManage } from '@/lib/account'

// A signed-in database client that returns `current` for the person's profile
// and `rpc` answers for the two account functions.
function fakeClient(current: string | null, rpc: Record<string, unknown> = {}) {
  const calls: string[] = []
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { current_account_id: current } }) }) }) }),
    rpc: async (name: string) => { calls.push(name); return { data: rpc[name] ?? null } },
  }
  return { client: client as never, calls }
}

describe('resolveAccount', () => {
  it('is the person’s own business when they haven’t switched, without asking the database twice', async () => {
    const { client, calls } = fakeClient(null)
    expect(await resolveAccount(client, 'u1')).toEqual({ userId: 'u1', accountId: 'u1', role: 'owner' })
    expect(calls).toEqual([])
  })

  it('is the team’s business, with the team role, after switching', async () => {
    const { client } = fakeClient('owner-1', { current_account_id: 'owner-1', current_account_role: 'staff' })
    expect(await resolveAccount(client, 'u1')).toEqual({ userId: 'u1', accountId: 'owner-1', role: 'staff' })
  })

  it('falls back to their own business when the database doesn’t honour the switch', async () => {
    // e.g. they were removed from the team, or never joined it
    const { client } = fakeClient('owner-1', { current_account_id: 'u1', current_account_role: 'owner' })
    expect(await resolveAccount(client, 'u1')).toEqual({ userId: 'u1', accountId: 'u1', role: 'owner' })
  })
})

describe('canManage', () => {
  it('lets owners and admins manage, not staff', () => {
    expect(canManage({ userId: 'a', accountId: 'a', role: 'owner' })).toBe(true)
    expect(canManage({ userId: 'b', accountId: 'a', role: 'admin' })).toBe(true)
    expect(canManage({ userId: 'c', accountId: 'a', role: 'staff' })).toBe(false)
  })
})
