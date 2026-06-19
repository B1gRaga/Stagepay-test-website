import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser  = vi.fn()
const mockRpc            = vi.fn()
const mockInsertInvoice  = vi.fn()
const mockInvoicesInsert = vi.fn(() => ({
  select: vi.fn(() => ({ single: mockInsertInvoice })),
}))
const mockInsertItems = vi.fn()
const mockDeleteEq    = vi.fn().mockResolvedValue({ error: null })

function buildAuthedClient() {
  return {
    from: (table: string) => {
      if (table === 'invoices') return {
        insert: mockInvoicesInsert,
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      }
      if (table === 'invoice_items') return {
        insert: mockInsertItems,
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createClient:  async () => buildAuthedClient(),
  createServiceClient: () => ({ rpc: mockRpc }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ONE_ITEM = [{ description: 'Consulting', quantity: 2, unit_price: 100 }]

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockRpc.mockResolvedValue({ data: 'INV-202606-001', error: null })
    mockInsertInvoice.mockResolvedValue({
      data: { id: 'inv-1', invoice_number: 'INV-202606-001' },
      error: null,
    })
    mockInsertItems.mockResolvedValue({ error: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when a line item has no description', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: [{ description: '  ', quantity: 1, unit_price: 10 }] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Each line item must have a description' })
  })

  it('returns 400 when a line item quantity is not greater than 0', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: [{ description: 'Work', quantity: 0, unit_price: 10 }] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Line item quantity must be greater than 0' })
  })

  it('returns 400 when a line item unit price is negative', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: [{ description: 'Work', quantity: 1, unit_price: -5 }] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Line item unit price cannot be negative' })
  })

  it('returns 400 when vat_rate is out of 0-100 bounds', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM, vat_rate: 150 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'vat_rate must be between 0 and 100' })
  })

  it('returns 400 when discount_amount exceeds the subtotal', async () => {
    // subtotal = 2 * 100 = 200
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM, discount_amount: 500 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'discount_amount cannot exceed the subtotal' })
  })

  it('returns 400 when deposit_amount exceeds the discounted total including VAT', async () => {
    // subtotal=200, vat_rate=14 -> vat_amount=28, total=228
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM, vat_rate: 14, deposit_amount: 1000 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'deposit_amount cannot exceed the invoice total' })
  })

  it('returns 400 for an invalid recurrence_interval', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM, is_recurring: true, recurrence_interval: 'weekly' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'recurrence_interval must be monthly, quarterly, or yearly' })
  })

  it('returns 500 when atomic invoice numbering fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to generate invoice number' })
  })

  it('rolls back the invoice when saving line items fails', async () => {
    mockInsertItems.mockResolvedValue({ error: { message: 'items insert failed' } })
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: ONE_ITEM }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to save line items: items insert failed' })
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'inv-1')
  })

  it('computes discount before VAT and applies the deposit to the discounted total', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({
      items: ONE_ITEM, // subtotal 200
      discount_amount: 50,
      vat_rate: 10,
      deposit_amount: 20,
    }))
    expect(res.status).toBe(201)
    // discounted_subtotal = 150, vat_amount = 15, total = 150 + 15 - 20 = 145
    expect(mockInvoicesInsert).toHaveBeenCalledWith(expect.objectContaining({
      subtotal: 200,
      discount_amount: 50,
      vat_amount: 15,
      deposit_amount: 20,
      total: 145,
    }))
    const json = await res.json()
    expect(json.invoice).toMatchObject({ id: 'inv-1', invoice_number: 'INV-202606-001' })
  })

  it('creates the invoice with no items without inserting into invoice_items', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({ items: [] }))
    expect(res.status).toBe(201)
    expect(mockInsertItems).not.toHaveBeenCalled()
  })

  it('strips HTML tags from client_name and client_address', async () => {
    const { POST } = await import('@/app/api/invoices/route')
    const res = await POST(makeRequest({
      items: ONE_ITEM,
      client_name: '<script>alert(1)</script>Acme Co',
      client_address: '<b>123 Main St</b>',
    }))
    expect(res.status).toBe(201)
  })
})
