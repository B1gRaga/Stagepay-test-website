import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockExpiredLimit = vi.fn()
const mockUpdateIn     = vi.fn()

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'profiles') return {
        select: vi.fn().mockReturnThis(),
        neq:    vi.fn().mockReturnThis(),
        lt:     vi.fn().mockReturnThis(),
        limit:  vi.fn(() => mockExpiredLimit()),
        update: vi.fn(() => ({ in: mockUpdateIn })),
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
  return new NextRequest('http://localhost/api/cron/subscription-expiry', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/subscription-expiry', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    mockUpdateIn.mockResolvedValue({ error: null })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {downgraded:0} when nothing has expired', async () => {
    mockExpiredLimit.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ downgraded: 0 })
    expect(mockUpdateIn).not.toHaveBeenCalled()
  })

  it('returns 500 when the DB fetch fails', async () => {
    mockExpiredLimit.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('downgrades expired profiles to free and clears their expiry', async () => {
    mockExpiredLimit.mockResolvedValue({
      data: [{ id: 'user-1', plan: 'pro' }, { id: 'user-2', plan: 'business' }],
      error: null,
    })
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ downgraded: 2 })
    expect(mockUpdateIn).toHaveBeenCalledWith('id', ['user-1', 'user-2'])
  })

  it('returns 500 when the downgrade update fails', async () => {
    mockExpiredLimit.mockResolvedValue({ data: [{ id: 'user-1', plan: 'pro' }], error: null })
    mockUpdateIn.mockResolvedValue({ error: { message: 'update failed' } })
    const { GET } = await import('@/app/api/cron/subscription-expiry/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })
})
