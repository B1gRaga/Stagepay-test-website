import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser = vi.fn()
const mockVerify = vi.fn()
const mockConfirmPlanUpgrade = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq:     mockEq.mockReturnThis(),
  single: mockSingle,
}))

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createServiceClient: () => ({ from: mockFrom }),
}))

// providerById records which provider the route asked for.
const mockProviderById = vi.fn()
vi.mock('@/lib/billing', async () => {
  const real = await vi.importActual<typeof import('@/lib/billing/provider')>('@/lib/billing/provider')
  return {
    returnedRef: real.returnedRef,
    providerById: (id: unknown) => { mockProviderById(id); return { verify: (...args: unknown[]) => mockVerify(...args) } },
    confirmPlanUpgrade: (...args: unknown[]) => mockConfirmPlanUpgrade(...args),
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(query?: string) {
  return new NextRequest(query ? `http://localhost/api/billing/verify?${query}` : 'http://localhost/api/billing/verify')
}

function locationOf(res: Response) {
  return res.headers.get('location')
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/billing/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to settings with no_token when no payment reference came back', async () => {
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(307)
    expect(locationOf(res)).toContain('reason=no_token')
  })

  it('redirects to login when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('TransactionToken=tok-1'))
    expect(locationOf(res)).toContain('/auth/login')
  })

  it('redirects with no_pending_plan when the reference isn’t a payment this person started', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: null })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('TransactionToken=tok-1'))
    expect(locationOf(res)).toContain('reason=no_pending_plan')
    // No point asking the provider about a reference we don't recognise.
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('redirects with verification_failed when the provider doesn’t confirm the payment', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'pro', pending_provider: 'dpo' } })
    mockVerify.mockResolvedValue({ success: false })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('TransactionToken=tok-1'))
    expect(locationOf(res)).toContain('reason=verification_failed')
    expect(mockConfirmPlanUpgrade).not.toHaveBeenCalled()
  })

  it('confirms the plan upgrade and redirects to settings on success', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'pro', pending_provider: 'dpo' } })
    mockVerify.mockResolvedValue({ success: true })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('TransactionToken=tok-1'))
    expect(mockEq).toHaveBeenCalledWith('dpo_transaction_ref', 'tok-1')
    expect(mockVerify).toHaveBeenCalledWith('tok-1')
    expect(mockConfirmPlanUpgrade).toHaveBeenCalledWith(expect.anything(), 'user-1', 'pro', 'tok-1')
    expect(locationOf(res)).toContain('billing=success')
    expect(locationOf(res)).toContain('plan=pro')
  })

  it('asks the provider that started the payment, not the one new payments go to', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'business', pending_provider: 'realpay' } })
    mockVerify.mockResolvedValue({ success: true })
    const { GET } = await import('@/app/api/billing/verify/route')
    const res = await GET(makeRequest('ref=rp-1'))
    expect(mockProviderById).toHaveBeenCalledWith('realpay')
    expect(mockVerify).toHaveBeenCalledWith('rp-1')
    expect(locationOf(res)).toContain('plan=business')
  })

  it('treats a payment from before providers were recorded as DPO', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'pro', pending_provider: null } })
    mockVerify.mockResolvedValue({ success: true })
    const { GET } = await import('@/app/api/billing/verify/route')
    await GET(makeRequest('TransactionToken=tok-1'))
    expect(mockProviderById).toHaveBeenCalledWith(null)
  })

  it('never trusts a plan parsed from the URL — only the server-side pending_plan column', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockSingle.mockResolvedValue({ data: { pending_plan: 'business', pending_provider: 'dpo' } })
    mockVerify.mockResolvedValue({ success: true })
    const { GET } = await import('@/app/api/billing/verify/route')
    // Attacker tries to smuggle a different plan via an unrelated query param.
    const res = await GET(makeRequest('TransactionToken=tok-1&plan=pro'))
    expect(locationOf(res)).toContain('plan=business')
  })
})
