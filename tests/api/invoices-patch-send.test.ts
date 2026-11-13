import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
let currentStatus = 'draft'
const mockSchedule = vi.fn().mockResolvedValue(3)
const updates: Record<string, unknown>[] = []

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
      chain.update = (row: Record<string, unknown>) => { updates.push(row); return chain }
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
  beforeEach(() => { mockSchedule.mockClear(); currentStatus = 'draft'; updates.length = 0 })

  it('starts the reminders when a draft is sent, and records when and how it went out', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    const res = await PATCH(patch({ status: 'sent' }), params)
    expect(res.status).toBe(200)
    expect(mockSchedule).toHaveBeenCalledWith('acct-1', 'inv-1', 'user-1')
    expect(updates[0]).toMatchObject({ status: 'sent', sent_via: 'whatsapp_link' })
    expect(typeof updates[0].sent_at).toBe('string')
    await PATCH(patch({ status: 'sent', sent_via: 'email' }), params)
    expect(updates[1]).toMatchObject({ sent_via: 'email' })
  })

  it('does not touch sent_at when an already-sent invoice changes', async () => {
    currentStatus = 'sent'
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    await PATCH(patch({ status: 'paid' }), params)
    expect(updates[0]).not.toHaveProperty('sent_at')
  })

  it('leaves reminders alone for any other change', async () => {
    const { PATCH } = await import('@/app/api/invoices/[id]/route')
    currentStatus = 'sent'
    await PATCH(patch({ status: 'paid' }), params)
    await PATCH(patch({ notes: 'Thanks' }), params)
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})
