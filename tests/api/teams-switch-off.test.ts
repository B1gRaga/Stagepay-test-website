import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// With NEXT_PUBLIC_TEAMS_ENABLED unset (as on the live site until launch),
// nobody can invite or join, whatever their plan.
vi.stubEnv('NEXT_PUBLIC_TEAMS_ENABLED', '')

const dbCalls: string[] = []
vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: async () => ({ id: 'owner-1', email: 'owner@co.com' }),
  createClient: async () => { dbCalls.push('createClient'); return {} },
  createServiceClient: () => { dbCalls.push('createServiceClient'); return {} },
}))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'owner-1', accountId: 'owner-1', role: 'owner' }),
}))

describe('team accounts switched off', () => {
  it('refuses invites before touching the database', async () => {
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(new NextRequest('http://localhost/api/team/invite', { method: 'POST', body: JSON.stringify({ email: 'a@b.com' }) }))
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })

  it('refuses joining before touching the database', async () => {
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(new NextRequest('http://localhost/api/team/accept', { method: 'POST', body: JSON.stringify({ token: 'tok' }) }))
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })
})
