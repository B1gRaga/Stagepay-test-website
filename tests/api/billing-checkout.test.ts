import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockCreatePaymentToken = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createServiceClient: () => ({ from: mockFrom }),
}))

// The person's business: their own unless the test makes them a team member.
let mockAccountId: string | null = null
vi.mock('@/lib/account', () => ({
  getAccount: async () => {
    const u = await mockGetCachedUser()
    return u ? { userId: u.id, accountId: mockAccountId ?? u.id, role: mockAccountId ? 'admin' : 'owner' } : null
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

vi.mock('@/lib/dpo', () => ({
  createPaymentToken: (...args: unknown[]) => mockCreatePaymentToken(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAccountId = null
    mockCheckRateLimit.mockResolvedValue(true)
    mockEq.mockResolvedValue({ error: null })
  })

  it('returns 403 when working in another person’s business, even as an admin', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'member-1' })
    mockAccountId = 'owner-1'
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(403)
    expect(mockCreatePaymentToken).not.toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCheckRateLimit.mockResolvedValue(false)
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 on invalid JSON body', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const req = new NextRequest('http://localhost/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when plan is not pro or business', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'free' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid plan' })
  })

  it('creates a payment token, stores pending_plan, and returns the payment URL', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreatePaymentToken.mockResolvedValue({ token: 'tok-1', paymentUrl: 'https://pay.example/tok-1' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'business' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ paymentUrl: 'https://pay.example/tok-1' })
    expect(mockCreatePaymentToken).toHaveBeenCalledWith('user-1', 'business')
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      dpo_transaction_ref: 'tok-1',
      pending_plan: 'business',
    }))
  })

  it('returns 500 with the underlying error message when DPO token creation fails', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreatePaymentToken.mockRejectedValue(new Error('DPO_COMPANY_TOKEN is not set'))
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'DPO_COMPANY_TOKEN is not set' })
  })
})
