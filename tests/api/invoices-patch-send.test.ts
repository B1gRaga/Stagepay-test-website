import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
let currentStatus = 'draft'
const mockSchedule = vi.fn().mockResolvedValue(3)

vi.mock('@/lib/reminder-schedule', () => ({ scheduleRemindersOnSend: (...a: unknown[]) => mockSchedule(...a) }))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }),
  canManage: () => true,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = () => chain
      chain.single = async () => ({ data: { id: 'inv-1', status: currentStatus }, error: null })
      return chain
    },
  }),
}))

function patch(body: unknown) {
  return new NextRequest('http://localhost/api/invoices/inv-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: 'inv-1' }) }

// ── Tests ──────────────────────────────────────────────────────────────────
describe('PATCH /api/invoices/[id] — sending', () => {
  beforeEach(() => { mockSchedule.mockClear(); currentStatus = 'draft' })

  it('starts the reminders when a draft is sent', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(patch({ status: 'sent' }), params)
    expect(res.status).toBe(200)
    expect(mockSchedule).toHaveBeenCalledWith('acct-1', 'inv-1', 'user-1')
  })

  it('leaves reminders alone for any other change', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    currentStatus = 'sent'
    await PATCH(patch({ status: 'paid' }), params)
    await PATCH(patch({ notes: 'Thanks' }), params)
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})
