import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Part payments: each one is recorded against the invoice; the one that
// clears the balance marks it paid, and "Mark as paid" records the balance.
let invoice: Record<string, any> | null
const inserts: { table: string; row: Record<string, any> }[] = []
const updates: { table: string; row: Record<string, any> }[] = []
const deletes: string[] = []

vi.mock('@/lib/reminder-schedule', () => ({ scheduleRemindersOnSend: async () => 0 }))
vi.mock('@/lib/payments', async (orig) => ({ ...(await orig<typeof import('@/lib/payments')>()), todayIso: () => '2026-11-05' }))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }),
  canManage: () => true,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, any> = {}
      let last: Record<string, any> | null = null
      chain.select = () => chain
      chain.eq = () => chain
      chain.insert = (row: Record<string, any>) => {
        inserts.push({ table, row }); last = { id: 'pay-new', created_at: '2026-11-05T10:00:00Z', ...row }; return chain
      }
      chain.update = (row: Record<string, any>) => { updates.push({ table, row }); return chain }
      chain.delete = () => { deletes.push(table); return chain }
      chain.single = async () => ({ data: last ?? invoice, error: null })
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok)
      return chain
    },
  }),
}))

const req = (method: string, body?: unknown, qs = '') => new NextRequest(`http://localhost/api/invoices/inv-1${qs}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})
const params = { params: Promise.resolve({ id: 'inv-1' }) }

describe('POST /api/invoices/[id]/payments', () => {
  beforeEach(() => {
    inserts.length = 0; updates.length = 0; deletes.length = 0
    invoice = { id: 'inv-1', status: 'sent', total: 1000, invoice_payments: [{ id: 'p1', amount: 300, paid_on: '2026-11-01', note: null, created_at: '2026-11-01T09:00:00Z' }] }
  })

  it('records a part payment and leaves the invoice open', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(req('POST', { amount: 200, paid_on: '2026-11-04', note: ' Orange Money ' }), params)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(inserts[0]).toMatchObject({ table: 'invoice_payments', row: { amount: 200, paid_on: '2026-11-04', note: 'Orange Money', user_id: 'acct-1' } })
    expect(updates).toHaveLength(0)
    expect(body.status).toBe('sent')
    expect(body.payments.map((p: { amount: number }) => p.amount)).toEqual([300, 200])
  })

  it('marks the invoice paid when the balance is cleared', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await POST(req('POST', { amount: 700 }), params)
    expect((await res.json()).status).toBe('paid')
    expect(inserts[0].row.paid_on).toBe('2026-11-05')
    expect(updates[0]).toEqual({ table: 'invoices', row: { status: 'paid' } })
  })

  it('refuses more than is owed, nothing, and future dates', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    expect((await POST(req('POST', { amount: 700.01 }), params)).status).toBe(400)
    expect((await POST(req('POST', { amount: 0 }), params)).status).toBe(400)
    expect((await POST(req('POST', { amount: 50, paid_on: '2026-11-06' }), params)).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('refuses drafts and paid invoices', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/payments/route')
    invoice = { ...invoice, status: 'draft' }
    expect((await POST(req('POST', { amount: 50 }), params)).status).toBe(400)
    invoice = { ...invoice, status: 'paid' }
    expect((await POST(req('POST', { amount: 50 }), params)).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('removes a payment from an open invoice, never from a paid one', async () => {
    const { DELETE } = await import('@/app/api/invoices/[id]/payments/route')
    const res = await DELETE(req('DELETE', undefined, '?payment=p1'), params)
    expect((await res.json()).payments).toEqual([])
    expect(deletes).toEqual(['invoice_payments'])
    invoice = { ...invoice, status: 'paid' }
    expect((await DELETE(req('DELETE', undefined, '?payment=p1'), params)).status).toBe(400)
    expect(deletes).toHaveLength(1)
  })
})

describe('PATCH /api/invoices/[id] — mark as paid', () => {
  beforeEach(() => { inserts.length = 0; updates.length = 0 })

  it('records what was still owed as received today, with the client’s reference', async () => {
    invoice = { id: 'inv-1', status: 'overdue', total: 1000, payment_claim_ref: 'MP1234', invoice_payments: [{ amount: 250 }] }
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    expect((await PATCH(req('PATCH', { status: 'paid' }), params)).status).toBe(200)
    expect(inserts).toEqual([{ table: 'invoice_payments', row: { invoice_id: 'inv-1', user_id: 'acct-1', amount: 750, paid_on: '2026-11-05', note: 'Ref MP1234' } }])
  })
})
