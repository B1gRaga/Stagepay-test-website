import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockStaleLimit = vi.fn()
const mockDeleteIn   = vi.fn()

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'clients') return {
        select: vi.fn().mockReturnThis(),
        lt:     vi.fn().mockReturnThis(),
        limit:  vi.fn(() => mockStaleLimit()),
        delete: vi.fn(() => ({ in: mockDeleteIn })),
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
  return new NextRequest('http://localhost/api/cron/archive-deleted', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/archive-deleted', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    mockDeleteIn.mockResolvedValue({ error: null })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {archived:0} when nothing is past the retention window', async () => {
    mockStaleLimit.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ archived: 0 })
    expect(mockDeleteIn).not.toHaveBeenCalled()
  })

  it('returns 500 when the DB fetch fails', async () => {
    mockStaleLimit.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('hard-deletes clients soft-deleted past the retention window', async () => {
    mockStaleLimit.mockResolvedValue({ data: [{ id: 'c-1' }, { id: 'c-2' }], error: null })
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ archived: 2 })
    expect(mockDeleteIn).toHaveBeenCalledWith('id', ['c-1', 'c-2'])
  })

  it('returns 500 when the delete fails', async () => {
    mockStaleLimit.mockResolvedValue({ data: [{ id: 'c-1' }], error: null })
    mockDeleteIn.mockResolvedValue({ error: { message: 'delete failed' } })
    const { GET } = await import('@/app/api/cron/archive-deleted/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })
})
