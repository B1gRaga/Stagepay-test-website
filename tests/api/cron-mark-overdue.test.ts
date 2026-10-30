import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
// Records each update: the values written and the filters it was narrowed by.
let updates: { values: Record<string, unknown>; filters: unknown[][] }[] = []
let result: { data: { id: string }[] | null; error: unknown } = { data: [], error: null }

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      update: (values: Record<string, unknown>) => {
        const u = { values, filters: [] as unknown[][] }
        updates.push(u)
        const chain = {
          eq:  (...a: unknown[]) => { u.filters.push(['eq', ...a]); return chain },
          lt:  (...a: unknown[]) => { u.filters.push(['lt', ...a]); return chain },
          gte: (...a: unknown[]) => { u.filters.push(['gte', ...a]); return chain },
          select: async () => result,
        }
        return chain
      },
    }),
  }),
}))

vi.mock('@/lib/logger', () => ({
  log: vi.fn(), logError: vi.fn(), logWarn: vi.fn(),
  cronitorPing: vi.fn().mockResolvedValue(undefined),
}))

function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/mark-overdue', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/mark-overdue', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    updates = []
    result = { data: [{ id: 'a' }, { id: 'b' }], error: null }
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })
  afterEach(() => vi.useRealTimers())

  it('returns 401 without the cron secret', async () => {
    const { GET } = await import('@/app/api/cron/mark-overdue/route')
    expect((await GET(makeRequest())).status).toBe(401)
    expect((await GET(makeRequest('wrong'))).status).toBe(401)
    expect(updates).toHaveLength(0)
  })

  it('marks sent invoices past their due date overdue, using the date in Gaborone', async () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Gaborone (UTC+2)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T23:30:00Z'))
    const { GET } = await import('@/app/api/cron/mark-overdue/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)

    const late = updates.find(u => u.values.status === 'overdue')!
    expect(late.filters).toEqual([['eq', 'status', 'sent'], ['lt', 'due_date', '2026-11-01']])
    expect(await res.json()).toEqual({ overdue: 2, backToSent: 2 })
  })

  it('puts an overdue invoice back to sent when its due date moved into the future', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T10:00:00Z'))
    const { GET } = await import('@/app/api/cron/mark-overdue/route')
    await GET(makeRequest(CRON_SECRET))

    const back = updates.find(u => u.values.status === 'sent')!
    expect(back.filters).toEqual([['eq', 'status', 'overdue'], ['gte', 'due_date', '2026-10-31']])
  })

  it('returns 500 when the database refuses', async () => {
    result = { data: null, error: { message: 'boom' } }
    const { GET } = await import('@/app/api/cron/mark-overdue/route')
    expect((await GET(makeRequest(CRON_SECRET))).status).toBe(500)
  })
})
