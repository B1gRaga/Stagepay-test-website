import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockRemindersQuery = vi.fn()
const mockUpdateReminder = vi.fn()
const mockProfileQuery   = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'reminders') return {
        select:  vi.fn().mockReturnThis(),
        eq:      vi.fn().mockReturnThis(),
        lte:     vi.fn().mockReturnThis(),
        limit:   vi.fn(() => mockRemindersQuery()),
        update:  vi.fn(() => ({ eq: mockUpdateReminder })),
      }
      if (table === 'profiles') return {
        select:  vi.fn().mockReturnThis(),
        eq:      vi.fn().mockReturnThis(),
        single:  mockProfileQuery,
      }
      return {}
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  log:          vi.fn(),
  logError:     vi.fn(),
  logWarn:      vi.fn(),
  cronitorPing: vi.fn().mockResolvedValue(undefined),
}))

// Prevent real email/WhatsApp calls
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: 'email-1' }) }
  },
}))

vi.mock('twilio', () => ({
  default: function () {
    return { messages: { create: vi.fn().mockResolvedValue({ sid: 'SM-1' }) } }
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/reminders', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/cron/reminders', () => {
  const CRON_SECRET = 'test-secret-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'invoices@test.co')
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/reminders/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/reminders/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns {sent:0} when no reminders are due', async () => {
    mockRemindersQuery.mockResolvedValue({ data: [], error: null })
    const { GET } = await import('@/app/api/cron/reminders/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ sent: 0 })
  })

  it('returns 500 when DB fetch fails', async () => {
    mockRemindersQuery.mockResolvedValue({ data: null, error: { message: 'connection error' } })
    const { GET } = await import('@/app/api/cron/reminders/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(500)
  })

  it('sends email reminder and reports sent count', async () => {
    mockProfileQuery.mockResolvedValue({
      data: { firm_name: 'ACME', name: null, email: 'owner@acme.co' },
    })
    mockUpdateReminder.mockResolvedValue({ error: null })
    mockRemindersQuery.mockResolvedValue({
      data: [{
        id: 'r-1',
        channel: 'email',
        recipient_email: 'client@test.co',
        recipient_phone: null,
        message_preview: 'Please pay invoice #001',
        invoices: {
          id: 'inv-1', invoice_number: '#001', client_name: 'Client Co',
          total: 500, currency: 'P', due_date: '2025-06-01', status: 'pending',
          user_id: 'user-1', invoice_items: [],
        },
      }],
      error: null,
    })
    const { GET } = await import('@/app/api/cron/reminders/route')
    const res = await GET(makeRequest(CRON_SECRET))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(json.failed).toBe(0)
  })
})
