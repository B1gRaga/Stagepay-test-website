import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser = vi.fn()
const mockVerifyPaymentToken = vi.fn()
const mockConfirmPlanUpgrade = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq:     vi.fn().mockReturnThis(),
  single: mockSingle,
}))

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/dpo', () => ({
  verifyPaymentToken: (...args: unknown[]) => mockVerifyPaymentToken(...args),
  confirmPlanUpgrade: (...args: unknown[]) => mockConfirmPlanUpgrade(...args),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/billing/verify?TransactionToken=${token}`
    : 'http://localhost/api/billing/verify'
  return new NextRequest(url)
}

function locationOf(res: Response) {
  return res.headers.get('location')
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/billing/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to settings with no_token when TransactionToken is missing', async () => {
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(307)
    expect(locationOf(res)).toContain('reason=no_token')
  })

  it('redirects to login when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('tok-1'))
    expect(locationOf(res)).toContain('/auth/login')
  })

  it('redirects with verification_failed when DPO verification fails', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockVerifyPaymentToken.mockResolvedValue({ success: false })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('tok-1'))
    expect(locationOf(res)).toContain('reason=verification_failed')
    expect(mockConfirmPlanUpgrade).not.toHaveBeenCalled()
  })

  it('redirects with no_pending_plan when the profile has no matching pending plan', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: null })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('tok-1'))
    expect(locationOf(res)).toContain('reason=no_pending_plan')
  })

  it('confirms the plan upgrade and redirects to settings on success', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'pro' } })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('tok-1'))
    expect(mockConfirmPlanUpgrade).toHaveBeenCalledWith(expect.anything(), 'user-1', 'pro')
    expect(locationOf(res)).toContain('billing=success')
    expect(locationOf(res)).toContain('plan=pro')
  })

  it('never trusts a plan parsed from the URL — only the server-side pending_plan column', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'business' } })
    const { GET } = await import('@/app/api/billing/verify/route')
    // Attacker tries to smuggle a different plan via an unrelated query param.
    const req = new NextRequest('http://localhost/api/billing/verify?TransactionToken=tok-1&plan=pro')
    const res = await GET(req)
    expect(locationOf(res)).toContain('plan=business')
  })
})
