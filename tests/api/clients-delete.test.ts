import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Deleting a client goes through the delete_client database function (a plain
// update can't mark a row deleted under the clients read rule), and Undo
// through restore_client. Staff are refused before the database is touched.
const account = { userId: 'owner-1', accountId: 'owner-1', role: 'owner' as 'owner' | 'admin' | 'staff' }
const rpcCalls: { fn: string; args: unknown }[] = []
let rpcResult: { data: unknown; error: unknown } = { data: true, error: null }

vi.mock('@/lib/account', () => ({
  getAccount: async () => account,
  canManage: (a: typeof account) => a.role === 'owner' || a.role === 'admin',
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return rpcResult },
  }),
}))

const params = { params: Promise.resolve({ id: 'client-1' }) }
const del = () => new NextRequest('http://localhost/api/clients/client-1', { method: 'DELETE' })
const restore = () => new NextRequest('http://localhost/api/clients/client-1/restore', { method: 'POST' })

describe('Deleting a client', () => {
  beforeEach(() => { rpcCalls.length = 0; account.role = 'owner'; rpcResult = { data: true, error: null } })

  it('uses delete_client for the owner', async () => {
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    const res = await DELETE(del(), params)
    expect(res.status).toBe(200)
    expect(rpcCalls).toEqual([{ fn: 'delete_client', args: { p_client_id: 'client-1' } }])
  })

  it('works for an admin too', async () => {
    account.role = 'admin'
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    expect((await DELETE(del(), params)).status).toBe(200)
  })

  it('refuses staff without touching the database', async () => {
    account.role = 'staff'
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    expect((await DELETE(del(), params)).status).toBe(403)
    expect(rpcCalls).toEqual([])
  })

  it('says not found when nothing was deleted', async () => {
    rpcResult = { data: false, error: null }
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    expect((await DELETE(del(), params)).status).toBe(404)
  })

  it('reports a database error as a failure', async () => {
    rpcResult = { data: null, error: { message: 'boom' } }
    const { DELETE } = await import('@/app/api/clients/[id]/route')
    expect((await DELETE(del(), params)).status).toBe(500)
  })
})

describe('Undoing a client delete', () => {
  beforeEach(() => { rpcCalls.length = 0; account.role = 'owner'; rpcResult = { data: true, error: null } })

  it('uses restore_client', async () => {
    const { POST } = await import('@/app/api/clients/[id]/restore/route')
    const res = await POST(restore(), params)
    expect(res.status).toBe(200)
    expect(rpcCalls).toEqual([{ fn: 'restore_client', args: { p_client_id: 'client-1' } }])
  })

  it('refuses staff', async () => {
    account.role = 'staff'
    const { POST } = await import('@/app/api/clients/[id]/restore/route')
    expect((await POST(restore(), params)).status).toBe(403)
    expect(rpcCalls).toEqual([])
  })

  it('says it can no longer be restored after the window', async () => {
    rpcResult = { data: false, error: null }
    const { POST } = await import('@/app/api/clients/[id]/restore/route')
    expect((await POST(restore(), params)).status).toBe(404)
  })
})
