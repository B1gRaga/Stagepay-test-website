import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// "I've paid" is public: it records the client's reference and emails the
// business, but never marks the invoice paid itself.
const updates: Record<string, unknown>[] = []
const sent: Record<string, any>[] = []
let invoice: Record<string, unknown> | null

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => true }))
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: Record<string, unknown>) => { sent.push(m); return {} } } } }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => table === 'profiles'
      ? { select: () => ({ eq: () => ({ single: async () => ({ data: { email: 'owner@example.com' } }) }) }) }
      : {
          select: () => ({ eq: () => ({ single: async () => ({ data: invoice }) }) }),
          update: (row: Record<string, unknown>) => { updates.push(row); return { eq: async () => ({ error: null }) } },
        },
  }),
}))

const post = (body: unknown) => new NextRequest('http://localhost/invoice/tok/paid', { method: 'POST', body: JSON.stringify(body) })
const params = { params: Promise.resolve({ token: 'tok' }) }

describe("I've paid", () => {
  beforeEach(() => {
    updates.length = 0; sent.length = 0
    process.env.RESEND_API_KEY = 'test'
    invoice = { id: 'inv-1', invoice_number: 'INV-015', client_name: 'Mrs Mosweu', total: 1425, currency: 'P', status: 'sent', user_id: 'u1' }
  })

  it('saves the reference and tells the business, without marking it paid', async () => {
    const { POST } = await import('@/app/invoice/[token]/paid/route')
    const res = await POST(post({ reference: ' MP241026.1532.A12345 ' }), params)
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ payment_claim_ref: 'MP241026.1532.A12345' })
    expect(updates[0]).not.toHaveProperty('status')
    expect(sent[0].to).toEqual(['owner@example.com'])
    expect(sent[0].subject).toBe('Mrs Mosweu says they paid INV-015')
  })

  it('asks for a reference', async () => {
    const { POST } = await import('@/app/invoice/[token]/paid/route')
    expect((await POST(post({ reference: ' ' }), params)).status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('refuses drafts and cancelled invoices', async () => {
    invoice = { ...invoice, status: 'cancelled' }
    const { POST } = await import('@/app/invoice/[token]/paid/route')
    expect((await POST(post({ reference: 'MP1234' }), params)).status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('does nothing for an invoice that is already paid', async () => {
    invoice = { ...invoice, status: 'paid' }
    const { POST } = await import('@/app/invoice/[token]/paid/route')
    const res = await POST(post({ reference: 'MP1234' }), params)
    expect(await res.json()).toEqual({ success: true, alreadyPaid: true })
    expect(updates).toHaveLength(0)
  })

  it('returns 404 for an unknown link', async () => {
    invoice = null
    const { POST } = await import('@/app/invoice/[token]/paid/route')
    expect((await POST(post({ reference: 'MP1234' }), params)).status).toBe(404)
  })
})
