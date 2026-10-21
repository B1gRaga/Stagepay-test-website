import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Staff in a team business may work on invoices but not delete them or change
// the business's settings and logo. These routes refuse before touching data.
const account = { userId: 'staff-1', accountId: 'owner-1', role: 'staff' as 'owner' | 'admin' | 'staff' }
const dbCalls: string[] = []

vi.mock('@/lib/account', () => ({
  getAccount: async () => account,
  canManage: (a: typeof account) => a.role === 'owner' || a.role === 'admin',
  accountProfileClient: async () => { dbCalls.push('profileClient'); return {} },
}))
vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: async () => ({ id: account.userId, email: 'staff@co.com' }),
  createClient: async () => { dbCalls.push('createClient'); return fakeDb },
  createServiceClient: () => { dbCalls.push('createServiceClient'); return fakeDb },
}))

// A query chain that accepts any further calls and, when awaited, succeeds.
const anyChain: unknown = new Proxy({}, {
  get: (_t, key) => key === 'then'
    ? (resolve: (v: unknown) => void) => resolve({ data: { id: 'inv-1', status: 'paid' }, error: null })
    : () => anyChain,
})

// For the one route that reads before deciding (cancelling needs the invoice's
// current status), a team invoice that is currently 'sent'.
const fakeDb = {
  from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: 'inv-1', status: 'sent' }, error: null }) }) }) }),
    update: () => { dbCalls.push('update'); return anyChain },
  }),
}

const params = { params: Promise.resolve({ id: 'inv-1' }) }

describe('Staff in a team business', () => {
  beforeEach(() => { dbCalls.length = 0; account.role = 'staff' })

  it('cannot delete an invoice', async () => {
    const { DELETE } = await import('@/app/api/invoices/[id]/route')
    const res = await DELETE(new NextRequest('http://localhost/api/invoices/inv-1', { method: 'DELETE' }), params)
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })

  it('cannot change business settings', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(new NextRequest('http://localhost/api/profile', { method: 'PATCH', body: JSON.stringify({ firm_name: 'Mine now' }) }))
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })

  it('cannot cancel an invoice, but the read before deciding is the only database call', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(new NextRequest('http://localhost/api/invoices/inv-1', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }), params)
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual(['createClient'])
  })

  it('can still mark an invoice paid (allowed for everyone)', async () => {
    account.role = 'staff'
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(new NextRequest('http://localhost/api/invoices/inv-1', { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) }), params)
    expect(res.status).not.toBe(403)
  })

  it('cannot delete a client', async () => {
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(new NextRequest('http://localhost/api/clients/c-1', { method: 'DELETE' }), { params: Promise.resolve({ id: 'c-1' }) })
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })

  it('cannot invite people to the team', async () => {
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(new NextRequest('http://localhost/api/team/invite', { method: 'POST', body: JSON.stringify({ email: 'friend@co.com' }) }))
    expect(res.status).toBe(403)
    expect(dbCalls).toEqual([])
  })

  it('cannot change or remove the logo', async () => {
    const { POST, DELETE } = await import('@/app/api/profile/logo/route')
    expect((await POST(new NextRequest('http://localhost/api/profile/logo', { method: 'POST' }))).status).toBe(403)
    expect((await DELETE()).status).toBe(403)
    expect(dbCalls).toEqual([])
  })
})
