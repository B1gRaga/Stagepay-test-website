import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockPendingQuery = vi.fn()
const mockVerifyPaymentToken = vi.fn()
const mockConfirmPlanUpgrade = vi.fn()
const mockClearEq = vi.fn().mockResolvedValue({ error: null })

function buildChain() {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    not:    vi.fn().mockReturnThis(),
    lt:     vi.fn().mockReturnThis(),
    limit:  vi.fn(() => mockPendingQuery()),
    update: vi.fn(() => ({ eq: mockClearEq })),
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

vi.mock('@/lib/logger', () => ({
  log:          vi.fn(),
  logError:     vi.fn(),
  logWarn:      vi.fn(),
  cronitorPing: vi.fn().mockResolvedValue(undefined),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/billing-reconcile', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

const NOW = Date.now()
const OLD_PENDING = {
  id: 'user-1',
  pending_plan: 'pro',
  dpo_transaction_ref: 'tok-1',
  // Past the 35-minute abandoned cutoff used by the route.
  dpo_token_created_at: new Date(NOW - 40 * 60 * 1000).toISOString(),
}
const RECENT_PENDING = {
  id: 'user-2',
  pending_plan: 'business',
  dpo_transaction_ref: 'tok-2',
  // Within the 35-minute window — should be left alone if still unverified.
  dpo_token_created_at: new Date(NOW - 10 * 60 * 1000).toISOString(),
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/billing-reconcile', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    mockClearEq.mockResolvedValue({ error: null })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {upgraded:0, cleared:0} when nothing is pending', async () => {
    mockPendingQuery.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ upgraded: 0, cleared: 0 })
  })

  it('returns 500 when the DB fetch fails', async () => {
    mockPendingQuery.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('confirms a plan upgrade when DPO verification now succeeds', async () => {
    mockPendingQuery.mockResolvedValue({ data: [RECENT_PENDING], error: null })
    mockVerifyPaymentToken.mockResolvedValue({ success: true })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    const json = await res.json()
    expect(json).toMatchObject({ upgraded: 1, cleared: 0 })
    expect(mockConfirmPlanUpgrade).toHaveBeenCalledWith(expect.anything(), 'user-2', 'business')
  })

  it('clears an abandoned token once past the TTL and still unverified', async () => {
    mockPendingQuery.mockResolvedValue({ data: [OLD_PENDING], error: null })
    mockVerifyPaymentToken.mockResolvedValue({ success: false })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    const json = await res.json()
    expect(json).toMatchObject({ upgraded: 0, cleared: 1 })
    expect(mockConfirmPlanUpgrade).not.toHaveBeenCalled()
  })

  it('leaves a recent, still-unverified token alone (re-checked next run)', async () => {
    mockPendingQuery.mockResolvedValue({ data: [RECENT_PENDING], error: null })
    mockVerifyPaymentToken.mockResolvedValue({ success: false })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    const json = await res.json()
    expect(json).toMatchObject({ upgraded: 0, cleared: 0 })
  })

  it('continues processing remaining profiles when one throws', async () => {
    mockPendingQuery.mockResolvedValue({ data: [OLD_PENDING, RECENT_PENDING], error: null })
    mockVerifyPaymentToken
      .mockRejectedValueOnce(new Error('DPO API error: 500'))
      .mockResolvedValueOnce({ success: true })
    const { GET } = await import('@/app/api/cron/billing-reconcile/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ upgraded: 1, cleared: 0 })
  })
})
