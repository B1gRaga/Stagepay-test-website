import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// With the switch on, the proxy must answer before it touches Supabase.
const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient }))

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  log: vi.fn(), logError: vi.fn(), logWarn: vi.fn(),
  cronitorPing: vi.fn().mockResolvedValue(undefined),
}))

import { proxy } from '@/proxy'
import { GET as markOverdue } from '@/app/api/cron/mark-overdue/route'
import { createServiceClient } from '@/lib/supabase/server'

describe('maintenance mode (MAINTENANCE_MODE=1)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('shows the maintenance page on portal pages, without reading the session', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
    const res = await proxy(new NextRequest('http://localhost/dashboard'))
    expect(res.status).toBe(503)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('down for maintenance')
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('shows the maintenance page on public invoice links', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
    const res = await proxy(new NextRequest('http://localhost/invoice/some-token'))
    expect(res.status).toBe(503)
  })

  it('answers API calls with a 503 JSON error', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
    const res = await proxy(new NextRequest('http://localhost/api/invoices', { method: 'POST' }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: expect.stringContaining('maintenance') })
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('stops a cron before it reaches the database', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
    vi.stubEnv('CRON_SECRET', 'test-secret-123')
    const res = await markOverdue(new NextRequest('http://localhost/api/cron/mark-overdue', {
      headers: { Authorization: 'Bearer test-secret-123' },
    }))
    expect(res.status).toBe(503)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('still rejects a cron call without the secret', async () => {
    vi.stubEnv('MAINTENANCE_MODE', '1')
    vi.stubEnv('CRON_SECRET', 'test-secret-123')
    const res = await markOverdue(new NextRequest('http://localhost/api/cron/mark-overdue'))
    expect(res.status).toBe(401)
  })

  it('is off unless the value is exactly 1', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'false')
    createServerClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    })
    const res = await proxy(new NextRequest('http://localhost/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })
})
