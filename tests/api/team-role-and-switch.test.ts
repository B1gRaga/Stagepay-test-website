import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const state = {
  account: { userId: 'owner-1', accountId: 'owner-1', role: 'owner' as 'owner' | 'admin' | 'staff' },
  memberOwner: 'owner-1' as string | null,    // owner of the member being changed
  membership: true,                           // switcher: is the person on the target's team?
  nowAccount: 'owner-1' as string | null,      // what current_account_id() says after saving
}
const writes: { table: string; values: unknown }[] = []

// A query chain that accepts any filter and resolves to `result`.
function chain(result: unknown): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  for (const k of ['eq', 'select', 'in']) c[k] = () => c
  c.single = async () => result
  c.maybeSingle = async () => result
  c.then = (resolve: (v: unknown) => void) => resolve({ error: null })
  return c
}

vi.mock('@/lib/account', () => ({ getAccount: async () => state.account }))
vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: async () => ({ id: state.account.userId }),
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => chain({ data: state.memberOwner ? { id: 'm-1', teams: { owner_id: state.memberOwner } } : null }),
      update: (values: unknown) => { writes.push({ table, values }); return chain(null) },
    }),
  }),
  createClient: async () => ({
    from: (table: string) => ({
      select: () => chain({ data: state.membership ? { id: 'm-1' } : null }),
      update: (values: unknown) => { writes.push({ table, values }); return chain(null) },
    }),
    rpc: async () => ({ data: state.nowAccount }),
  }),
}))

const patch = (body: unknown) => new NextRequest('http://localhost/api/team/role', { method: 'PATCH', body: JSON.stringify(body) })
const post = (body: unknown) => new NextRequest('http://localhost/api/account/switch', { method: 'POST', body: JSON.stringify(body) })

describe('PATCH /api/team/role', () => {
  beforeEach(() => {
    writes.length = 0
    state.account = { userId: 'owner-1', accountId: 'owner-1', role: 'owner' }
    state.memberOwner = 'owner-1'
  })

  it('lets the owner make someone an admin', async () => {
    const { PATCH } = await import('@/app/api/team/role/route')
    const res = await PATCH(patch({ memberId: 'm-1', role: 'admin' }))
    expect(res.status).toBe(200)
    expect(writes).toEqual([{ table: 'team_members', values: { role: 'admin' } }])
  })

  it('refuses admins and staff', async () => {
    state.account = { userId: 'admin-1', accountId: 'owner-1', role: 'admin' }
    const { PATCH } = await import('@/app/api/team/role/route')
    expect((await PATCH(patch({ memberId: 'm-1', role: 'admin' }))).status).toBe(403)
    expect(writes).toEqual([])
  })

  it('refuses a role that isn’t admin or staff, and someone on another team', async () => {
    const { PATCH } = await import('@/app/api/team/role/route')
    expect((await PATCH(patch({ memberId: 'm-1', role: 'owner' }))).status).toBe(400)
    state.memberOwner = 'someone-else'
    expect((await PATCH(patch({ memberId: 'm-1', role: 'staff' }))).status).toBe(404)
    expect(writes).toEqual([])
  })
})

describe('POST /api/account/switch', () => {
  beforeEach(() => {
    writes.length = 0
    state.account = { userId: 'user-1', accountId: 'user-1', role: 'owner' }
    state.membership = true
    state.nowAccount = 'owner-1'
  })

  it('opens a team business the person belongs to', async () => {
    const { POST } = await import('@/app/api/account/switch/route')
    const res = await POST(post({ accountId: 'owner-1' }))
    expect(res.status).toBe(200)
    expect(writes).toEqual([{ table: 'profiles', values: { current_account_id: 'owner-1' } }])
  })

  it('goes back to their own business', async () => {
    state.nowAccount = 'user-1'
    const { POST } = await import('@/app/api/account/switch/route')
    const res = await POST(post({ accountId: 'user-1' }))
    expect(res.status).toBe(200)
    expect(writes).toEqual([{ table: 'profiles', values: { current_account_id: null } }])
  })

  it('refuses a business they aren’t on the team of, without saving', async () => {
    state.membership = false
    const { POST } = await import('@/app/api/account/switch/route')
    expect((await POST(post({ accountId: 'stranger-1' }))).status).toBe(403)
    expect(writes).toEqual([])
  })

  it('says so when the team is paused because the owner’s plan ended', async () => {
    state.nowAccount = 'user-1'   // the database didn't honour the switch
    const { POST } = await import('@/app/api/account/switch/route')
    const res = await POST(post({ accountId: 'owner-1' }))
    expect(res.status).toBe(409)
  })
})
