import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Once an invoice has gone out, what it says is fixed and it can't be deleted;
// VAT needs a VAT number. (The database enforces the same: migration 051.)

// ── Mocks ──────────────────────────────────────────────────────────────────
let saved: Record<string, unknown> = {}
let vatNumber: string | null = null
const updates: Record<string, unknown>[] = []
const itemWrites: string[] = []
let deleted = false

vi.mock('@/lib/reminder-schedule', () => ({ scheduleRemindersOnSend: vi.fn().mockResolvedValue(0) }))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }),
  canManage: () => true,
  accountProfileClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { vat_number: vatNumber }, error: null }) }) }) }),
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = (row: Record<string, unknown>) => { updates.push(row); return chain }
      chain.insert = async () => { itemWrites.push(`insert:${table}`); return { error: null } }
      chain.delete = () => { if (table === 'invoices') deleted = true; else itemWrites.push(`delete:${table}`); return chain }
      chain.single = async () => ({ data: saved, error: null })
      chain.then = (res: (v: unknown) => unknown) => res({ error: null })
      return chain
    },
  }),
}))

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/invoices/inv-1', {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
}
const params = { params: Promise.resolve({ id: 'inv-1' }) }

const SENT = {
  id: 'inv-1', status: 'sent', total: 228, payment_claim_ref: null, invoice_payments: [],
  client_name: 'Mrs Dube', client_address: null, client_vat: null, project: 'May fees', billed_for: 'Kago',
  notes: null, issue_date: '2026-11-01', currency: 'P', vat_rate: 0, discount_amount: 0, deposit_amount: 0,
  invoice_items: [{ description: 'Tuition', quantity: 1, unit_price: 200, sort_order: 0 }],
}

beforeEach(() => {
  saved = { ...SENT }; vatNumber = null; updates.length = 0; itemWrites.length = 0; deleted = false
})

// ── Tests ──────────────────────────────────────────────────────────────────
describe('a sent invoice is locked', () => {
  it('refuses a change to the amount', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', { items: [{ description: 'Tuition', quantity: 1, unit_price: 150 }] }), params)
    expect(res.status).toBe(409)
    expect(itemWrites).toEqual([])
    expect(updates).toEqual([])
  })

  it('refuses a backdated issue date', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', { issue_date: '2026-01-01' }), params)
    expect(res.status).toBe(409)
  })

  it('accepts the editor resending the same values, without rewriting the items', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', {
      client_name: 'Mrs Dube ', project: 'May fees', billed_for: 'Kago', notes: '', issue_date: '2026-11-01',
      currency: 'P', vat_rate: '0', discount_amount: 0, deposit_amount: 0, due_date: '2026-11-30',
      items: [{ description: 'Tuition', quantity: 1, unit_price: 200 }],
    }), params)
    expect(res.status).toBe(200)
    expect(itemWrites).toEqual([])
    expect(updates[0]).toEqual({ due_date: '2026-11-30' })
  })

  it('still allows the status to move on, e.g. to cancelled', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', { status: 'cancelled' }), params)
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ status: 'cancelled' })
  })

  it('cannot be deleted', async () => {
    const { DELETE } = await import('@/app/api/invoices/[id]/route')
    const res = await DELETE(req('DELETE'), params)
    expect(res.status).toBe(409)
    expect(deleted).toBe(false)
  })
})

describe('a draft stays editable', () => {
  it('can change its items and be deleted', async () => {
    saved = { ...SENT, status: 'draft' }
    const { PATCH, DELETE } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', { items: [{ description: 'Tuition', quantity: 1, unit_price: 150 }] }), params)
    expect(res.status).toBe(200)
    expect(itemWrites).toEqual(['delete:invoice_items', 'insert:invoice_items'])
    expect((await DELETE(req('DELETE'), params)).status).toBe(200)
    expect(deleted).toBe(true)
  })

  it('needs a VAT number to add VAT', async () => {
    saved = { ...SENT, status: 'draft' }
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(req('PATCH', { vat_rate: 14 }), params)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/VAT number/)
    vatNumber = 'P03012345678'
    expect((await PATCH(req('PATCH', { vat_rate: 14 }), params)).status).toBe(200)
  })
})
