import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockExpiringLimit = vi.fn()
const mockEmailsSend    = vi.fn()

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'profiles') return {
        select: vi.fn().mockReturnThis(),
        neq:    vi.fn().mockReturnThis(),
        gte:    vi.fn().mockReturnThis(),
        lt:     vi.fn().mockReturnThis(),
        limit:  vi.fn(() => mockExpiringLimit()),
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

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => mockEmailsSend(...args) }
  },
}))

// Skip real backoff delays — retry behavior itself is covered by lib/retry's own logic.
vi.mock('@/lib/retry', () => ({
  withRetry: (fn: () => Promise<unknown>) => fn(),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/subscription-renewal-reminder', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/subscription-renewal-reminder', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'invoices@test.co')
    mockEmailsSend.mockResolvedValue({ id: 'email-1' })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {sent:0, failed:0} when nothing is expiring soon', async () => {
    mockExpiringLimit.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ sent: 0, failed: 0 })
  })

  it('returns 500 when the DB fetch fails', async () => {
    mockExpiringLimit.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('reports email-not-configured instead of failing when RESEND_API_KEY is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    mockExpiringLimit.mockResolvedValue({
      data: [{ id: 'user-1', email: 'a@b.com', name: null, firm_name: 'ACME', plan: 'pro', subscription_expires_at: '2026-06-22T00:00:00Z' }],
      error: null,
    })
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ sent: 0, failed: 0, message: 'Email not configured' })
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('sends a renewal reminder email and reports the sent count', async () => {
    mockExpiringLimit.mockResolvedValue({
      data: [{ id: 'user-1', email: 'a@b.com', name: null, firm_name: 'ACME', plan: 'pro', subscription_expires_at: '2026-06-22T00:00:00Z' }],
      error: null,
    })
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ sent: 1, failed: 0 })
    expect(mockEmailsSend).toHaveBeenCalledWith(expect.objectContaining({ to: ['a@b.com'] }))
  })

  it('counts a failure for profiles with no email without crashing', async () => {
    mockExpiringLimit.mockResolvedValue({
      data: [{ id: 'user-1', email: null, name: null, firm_name: 'ACME', plan: 'pro', subscription_expires_at: '2026-06-22T00:00:00Z' }],
      error: null,
    })
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(await res.json()).toMatchObject({ sent: 0, failed: 1 })
  })

  it('counts a failure when the email send throws', async () => {
    mockExpiringLimit.mockResolvedValue({
      data: [{ id: 'user-1', email: 'a@b.com', name: null, firm_name: 'ACME', plan: 'pro', subscription_expires_at: '2026-06-22T00:00:00Z' }],
      error: null,
    })
    mockEmailsSend.mockRejectedValue(new Error('Resend API error'))
    const { GET } = await import('@/app/api/cron/subscription-renewal-reminder/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(await res.json()).toMatchObject({ sent: 0, failed: 1 })
  })
})
