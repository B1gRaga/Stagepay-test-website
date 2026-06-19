import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockTemplatesLimit       = vi.fn()
const mockRpc                  = vi.fn()
const mockInvoiceInsertSingle  = vi.fn()
const mockItemsInsert          = vi.fn()
const mockTemplateUpdateEq     = vi.fn()

function buildServiceClient() {
  return {
    rpc: mockRpc,
    from: (table: string) => {
      if (table === 'invoices') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        lte:    vi.fn().mockReturnThis(),
        limit:  vi.fn(() => mockTemplatesLimit()),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInvoiceInsertSingle })) })),
        update: vi.fn(() => ({ eq: mockTemplateUpdateEq })),
      }
      if (table === 'invoice_items') return {
        insert: mockItemsInsert,
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => buildServiceClient(),
}))

vi.mock('@/lib/logger', () => ({
  log: vi.fn(), logError: vi.fn(), logWarn: vi.fn(),
  cronitorPing: vi.fn().mockResolvedValue(undefined),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/recurring-invoices', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

const TEMPLATE = {
  id: 'tmpl-1', user_id: 'user-1', client_id: 'client-1',
  client_name: 'Client Co', client_email: null, client_phone: null,
  client_address: null, client_vat: null, project: null, notes: null,
  issue_date: '2026-05-01', due_date: '2026-05-31',
  subtotal: 200, vat_rate: 14, vat_amount: 28, discount_amount: 0,
  deposit_amount: 0, total: 228, currency: 'P',
  next_recurring_date: '2026-06-01', recurrence_interval: 'monthly',
  invoice_items: [{ description: 'Service', quantity: 1, unit_price: 200, sort_order: 0 }],
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/recurring-invoices', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    mockTemplateUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {generated:0, failed:0} when no templates are due', async () => {
    mockTemplatesLimit.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ generated: 0, failed: 0 })
  })

  it('returns 500 when the DB fetch fails', async () => {
    mockTemplatesLimit.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('clones a due template into a new draft invoice and advances its schedule', async () => {
    mockTemplatesLimit.mockResolvedValue({ data: [TEMPLATE], error: null })
    mockRpc.mockResolvedValue({ data: 'INV-202606-002', error: null })
    mockInvoiceInsertSingle.mockResolvedValue({ data: { id: 'new-inv-1' }, error: null })
    mockItemsInsert.mockResolvedValue({ error: null })
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ generated: 1, failed: 0 })
    expect(mockTemplateUpdateEq).toHaveBeenCalledWith('id', 'tmpl-1')
  })

  it('counts a failure without crashing when invoice numbering fails', async () => {
    mockTemplatesLimit.mockResolvedValue({ data: [TEMPLATE], error: null })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ generated: 0, failed: 1 })
  })

  it('counts a failure when copying line items fails', async () => {
    mockTemplatesLimit.mockResolvedValue({ data: [TEMPLATE], error: null })
    mockRpc.mockResolvedValue({ data: 'INV-202606-002', error: null })
    mockInvoiceInsertSingle.mockResolvedValue({ data: { id: 'new-inv-1' }, error: null })
    mockItemsInsert.mockResolvedValue({ error: { message: 'copy failed' } })
    const { GET } = await import('@/app/api/cron/recurring-invoices/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(await res.json()).toMatchObject({ generated: 0, failed: 1 })
  })
})
