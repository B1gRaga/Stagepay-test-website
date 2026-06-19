import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser      = vi.fn()
const mockInvoiceSingle      = vi.fn()
const mockProfileSingle      = vi.fn()
const mockGenerateInvoicePDF = vi.fn()
const invoiceEqCalls: unknown[][] = []

function buildClient() {
  const invoicesChain: Record<string, unknown> = {}
  invoicesChain.select = vi.fn(() => invoicesChain)
  invoicesChain.eq = vi.fn((...args: unknown[]) => { invoiceEqCalls.push(args); return invoicesChain })
  invoicesChain.single = mockInvoiceSingle

  return {
    from: (table: string) => {
      if (table === 'invoices') return invoicesChain
      if (table === 'profiles') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockProfileSingle,
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createClient:  async () => buildClient(),
}))

vi.mock('@/lib/invoice-pdf', () => ({
  generateInvoicePDF: (...args: unknown[]) => mockGenerateInvoicePDF(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(query = '') {
  return new NextRequest(`http://localhost/api/invoices/inv-1/pdf${query}`)
}
const params = { params: Promise.resolve({ id: 'inv-1' }) }

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/invoices/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invoiceEqCalls.length = 0
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest(), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when the invoice does not exist or is not owned by the user', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({ data: null })
    mockProfileSingle.mockResolvedValue({ data: { firm_name: 'ACME' } })
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest(), params)
    expect(res.status).toBe(404)
  })

  it('scopes the invoice lookup to the authenticated user (ownership check)', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({ data: null })
    mockProfileSingle.mockResolvedValue({ data: {} })
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    await GET(makeRequest(), params)
    expect(invoiceEqCalls).toContainEqual(['user_id', 'user-1'])
  })

  it('generates a PDF and returns it as an attachment by default', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({
      data: { id: 'inv-1', invoice_number: 'INV-001', invoice_items: [] },
    })
    mockProfileSingle.mockResolvedValue({ data: { firm_name: 'ACME' } })
    mockGenerateInvoicePDF.mockResolvedValue(Buffer.from('%PDF-1.4'))
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest(), params)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="INV-001.pdf"')
  })

  it('returns an inline disposition when view=true', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({
      data: { id: 'inv-1', invoice_number: 'INV-001', invoice_items: [] },
    })
    mockProfileSingle.mockResolvedValue({ data: {} })
    mockGenerateInvoicePDF.mockResolvedValue(Buffer.from('%PDF-1.4'))
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest('?view=true'), params)
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="INV-001.pdf"')
  })

  it('falls back to an empty profile object when the profile row is missing', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({
      data: { id: 'inv-1', invoice_number: 'INV-001', invoice_items: [] },
    })
    mockProfileSingle.mockResolvedValue({ data: null })
    mockGenerateInvoicePDF.mockResolvedValue(Buffer.from('%PDF-1.4'))
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest(), params)
    expect(res.status).toBe(200)
    expect(mockGenerateInvoicePDF).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), {}, expect.anything(),
    )
  })

  it('returns 500 when PDF generation throws', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInvoiceSingle.mockResolvedValue({
      data: { id: 'inv-1', invoice_number: 'INV-001', invoice_items: [] },
    })
    mockProfileSingle.mockResolvedValue({ data: {} })
    mockGenerateInvoicePDF.mockRejectedValue(new Error('render failed'))
    const { GET } = await import('@/app/api/invoices/[id]/pdf/route')
    const res = await GET(makeRequest(), params)
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to generate PDF' })
  })
})
