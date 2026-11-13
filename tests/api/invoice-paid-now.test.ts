import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// A walk-in payment: the whole balance is recorded today with how it was paid,
// the invoice becomes paid, and any booked reminders go.
let invoice: Record<string, any> | null
const inserts: { table: string; row: Record<string, any> }[] = []
const updates: { table: string; row: Record<string, any> }[] = []
const deletes: { table: string; filters: Record<string, unknown> }[] = []

vi.mock('@/lib/payments', async (orig) => ({ ...(await orig<typeof import('@/lib/payments')>()), todayIso: () => '2026-11-13' }))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, any> = {}
      let last: Record<string, any> | null = null
      let deleting: Record<string, unknown> | null = null
      chain.select = () => chain
      chain.eq = (k: string, v: unknown) => { if (deleting) deleting[k] = v; return chain }
      chain.insert = (row: Record<string, any>) => {
        inserts.push({ table, row }); last = { id: 'pay-new', created_at: '2026-11-13T09:00:00Z', ...row }; return chain
      }
      chain.update = (row: Record<string, any>) => { updates.push({ table, row }); return chain }
      chain.delete = () => { deleting = {}; deletes.push({ table, filters: deleting }); return chain }
      chain.single = async () => ({ data: last ?? invoice, error: null })
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok)
      return chain
    },
  }),
}))

const post = (body: unknown) => new NextRequest('http://localhost/api/invoices/inv-1/paid-now', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
const params = { params: Promise.resolve({ id: 'inv-1' }) }

describe('POST /api/invoices/[id]/paid-now', () => {
  beforeEach(() => {
    inserts.length = 0; updates.length = 0; deletes.length = 0
    invoice = { id: 'inv-1', status: 'draft', total: 1254, invoice_payments: [] }
  })

  it('records the whole amount as paid today by the chosen method, marks it paid, and drops booked reminders', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    const res = await POST(post({ method: 'Cash' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('paid')
    expect(inserts).toEqual([{ table: 'invoice_payments', row: { invoice_id: 'inv-1', user_id: 'acct-1', amount: 1254, paid_on: '2026-11-13', note: 'Cash' } }])
    expect(updates).toEqual([{ table: 'invoices', row: { status: 'paid' } }])
    expect(deletes).toEqual([{ table: 'reminders', filters: { invoice_id: 'inv-1', user_id: 'acct-1', status: 'scheduled' } }])
    expect(body.payments).toHaveLength(1)
  })

  it('keeps the reference with the method, and only records what was still owed', async () => {
    invoice!.status = 'sent'
    invoice!.invoice_payments = [{ id: 'p1', amount: 500, paid_on: '2026-11-10', note: 'Orange Money', created_at: '2026-11-10T08:00:00Z' }]
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    const res = await POST(post({ method: 'Orange Money', reference: ' TX-88213 ' }), params)
    expect(res.status).toBe(200)
    expect(inserts[0].row).toMatchObject({ amount: 754, note: 'Orange Money · TX-88213' })
    expect((await res.json()).payments).toHaveLength(2)
  })

  it('refuses a method it does not know', async () => {
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    const res = await POST(post({ method: 'Goat' }), params)
    expect(res.status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('does nothing to an invoice that is already paid, and says so', async () => {
    invoice!.status = 'paid'
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    const body = await (await POST(post({ method: 'Cash' }), params)).json()
    expect(body).toMatchObject({ status: 'paid', alreadyPaid: true })
    expect(inserts).toHaveLength(0)
    expect(updates).toHaveLength(0)
  })

  it('will not take payment on a cancelled invoice', async () => {
    invoice!.status = 'cancelled'
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    expect((await POST(post({ method: 'Cash' }), params)).status).toBe(400)
  })

  it('404s for an invoice that is not this account’s', async () => {
    invoice = null
    const { POST } = await import('@/app/api/invoices/[id]/paid-now/route')
    expect((await POST(post({ method: 'Cash' }), params)).status).toBe(404)
  })
})
