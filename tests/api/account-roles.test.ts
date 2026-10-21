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
  createClient: async () => { dbCalls.push('createClient'); return {} },
  createServiceClient: () => { dbCalls.push('createServiceClient'); return {} },
}))

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

  it('cannot change or remove the logo', async () => {
    const { POST, DELETE } = await import('@/app/api/profile/logo/route')
    expect((await POST(new NextRequest('http://localhost/api/profile/logo', { method: 'POST' }))).status).toBe(403)
    expect((await DELETE()).status).toBe(403)
    expect(dbCalls).toEqual([])
  })
})
