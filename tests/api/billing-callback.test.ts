import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockVerifyPaymentToken = vi.fn()
const mockConfirmPlanUpgrade = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()

function buildChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    single:  mockSingle,
    update:  vi.fn(() => ({ eq: mockEq })),
    ...overrides,
  }
  return chain
}

const mockFrom = vi.fn(() => buildChain())

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/dpo', () => ({
  verifyPaymentToken: (...args: unknown[]) => mockVerifyPaymentToken(...args),
  confirmPlanUpgrade: (...args: unknown[]) => mockConfirmPlanUpgrade(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: Record<string, string>, contentType = 'application/json') {
  const encoded = contentType.includes('json')
    ? JSON.stringify(body)
    : new URLSearchParams(body).toString()
  return new NextRequest('http://localhost/api/billing/callback', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: encoded,
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/billing/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
  })

  it('returns 400 when TransactionToken is missing', async () => {
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing TransactionToken' })
  })

  it('returns 400 when TransactionToken is missing from form-urlencoded body', async () => {
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({}, 'application/x-www-form-urlencoded'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when DPO verification fails', async () => {
    mockVerifyPaymentToken.mockResolvedValue({ success: false })
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({ TransactionToken: 'bad-token' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Payment verification failed' })
  })

  it('returns 400 when transaction is not found in the database', async () => {
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: null })
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({ TransactionToken: 'ghost-token' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Unknown transaction' })
  })

  it('returns 400 when profile has no pending_plan', async () => {
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: { id: 'user-1', pending_plan: null } })
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({ TransactionToken: 'valid-token' }))
    expect(res.status).toBe(400)
  })

  it('upgrades the user plan and returns 200 on valid payment', async () => {
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: { id: 'user-1', pending_plan: 'pro' } })
    mockFrom.mockReturnValue(buildChain({ update: vi.fn(() => ({ eq: mockEq })) }))
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest({ TransactionToken: 'valid-token' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('accepts form-urlencoded TransactionToken', async () => {
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: { id: 'user-1', pending_plan: 'pro' } })
    const { POST } = await import('@/app/api/billing/callback/route')
    const res = await POST(makeRequest(
      { TransactionToken: 'valid-token' },
      'application/x-www-form-urlencoded',
    ))
    expect(res.status).toBe(200)
  })
})
