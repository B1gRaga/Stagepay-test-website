import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockCreateCheckout = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
  select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
}))

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

// Whoever takes payments; the route must not care which provider it is.
const provider = { id: 'dpo', name: 'DPO Pay', currencies: ['BWP'], createCheckout: (...args: unknown[]) => mockCreateCheckout(...args) }
vi.mock('@/lib/billing', () => ({
  activeProvider: () => provider,
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
    provider.id = 'dpo'
    provider.currencies = ['BWP']
    mockCheckRateLimit.mockResolvedValue(true)
    mockEq.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({ data: { default_currency: 'P' } })
  })

  it('returns 403 when working in another person’s business, even as an admin', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'member-1' })
    mockAccountId = 'owner-1'
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(403)
    expect(mockCreateCheckout).not.toHaveBeenCalled()
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

  it('starts a payment, stores what was started (plan, period, provider, currency), and returns the payment URL', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreateCheckout.mockResolvedValue({ ref: 'tok-1', paymentUrl: 'https://pay.example/tok-1' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'business' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ paymentUrl: 'https://pay.example/tok-1' })
    expect(mockCreateCheckout).toHaveBeenCalledWith({
      userId: 'user-1', plan: 'business', months: 1, currency: 'BWP', amount: '400.00', description: 'Stagepay Business Plan — Monthly',
    })
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      dpo_transaction_ref: 'tok-1',
      pending_plan: 'business',
      pending_months: 1,
      pending_provider: 'dpo',
      pending_currency: 'BWP',
    }))
  })

  it('charges for the months chosen and stores them for when the payment is confirmed', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreateCheckout.mockResolvedValue({ ref: 'tok-2', paymentUrl: 'https://pay.example/tok-2' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro', months: 12 }))
    expect(res.status).toBe(200)
    expect(mockCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro', months: 12, amount: '1080.00' }))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pending_plan: 'pro', pending_months: 12 }))
  })

  it('records which provider took the payment, so it can be confirmed with the same one', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    provider.id = 'realpay'
    provider.currencies = ['BWP', 'ZAR']
    mockCreateCheckout.mockResolvedValue({ ref: 'rp-1', paymentUrl: 'https://realpay.example/rp-1' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ dpo_transaction_ref: 'rp-1', pending_provider: 'realpay' }))
  })

  it('bills a Rand business in Rand, at the Rand price, when the provider can charge Rand', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { default_currency: 'R' } })
    provider.currencies = ['BWP', 'ZAR']
    mockCreateCheckout.mockResolvedValue({ ref: 'tok-3', paymentUrl: 'https://pay.example/tok-3' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    await POST(makeRequest({ plan: 'pro' }))
    expect(mockCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ currency: 'ZAR', amount: '120.00' }))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pending_currency: 'ZAR' }))
  })

  it('bills a Rand business in Pula while the provider only takes Pula', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { default_currency: 'R' } })
    provider.currencies = ['BWP']
    mockCreateCheckout.mockResolvedValue({ ref: 'tok-4', paymentUrl: 'https://pay.example/tok-4' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    await POST(makeRequest({ plan: 'pro' }))
    expect(mockCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ currency: 'BWP', amount: '100.00' }))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pending_currency: 'BWP' }))
  })

  it('returns 400 for a billing period that isn’t 1, 6 or 12 months', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro', months: 3 }))
    expect(res.status).toBe(400)
    expect(mockCreateCheckout).not.toHaveBeenCalled()
  })

  it('returns 500 with the underlying error message when the provider can’t start the payment', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreateCheckout.mockRejectedValue(new Error('DPO_COMPANY_TOKEN is not set'))
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'DPO_COMPANY_TOKEN is not set' })
  })

  it('doesn’t send the customer to pay when the reference couldn’t be stored', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockCreateCheckout.mockResolvedValue({ ref: 'tok-4', paymentUrl: 'https://pay.example/tok-4' })
    mockEq.mockResolvedValue({ error: { message: 'column does not exist' } })
    const { POST } = await import('@/app/api/billing/checkout/route')
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/save the payment reference/)
  })
})
