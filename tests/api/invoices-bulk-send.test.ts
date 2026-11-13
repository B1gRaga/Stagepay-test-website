import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Sending a whole class on WhatsApp from StagePay's number: only Business
// accounts, only drafts with a number, one send per invoice however many taps,
// a failed send goes back to draft, and Meta's daily cap stops the batch.

let plan = 'business'
let invoices: Record<string, any>[] = []
let recentSends: { recipient: string }[] = []
let recentReminders: { recipient_phone: string }[] = []
const claimed = new Set<string>()            // drafts already moved to sent
const updates: { table: string; row: Record<string, any>; filters: Record<string, unknown> }[] = []
const inserts: { table: string; row: Record<string, any> }[] = []
const mockSend = vi.fn()
const mockSchedule = vi.fn().mockResolvedValue(2)
const mockRate = vi.fn().mockResolvedValue(true)

vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }),
  accountProfileClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan, firm_name: 'Thuto Tuition Centre', name: 'Neo', business_type: 'school' } }) }) }) }),
  }),
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: (...a: unknown[]) => mockRate(...a) }))
vi.mock('@/lib/reminder-schedule', () => ({ scheduleRemindersOnSend: (...a: unknown[]) => mockSchedule(...a) }))
vi.mock('@/lib/whatsapp', async (orig) => ({
  ...(await orig<typeof import('@/lib/whatsapp')>()),
  isWhatsAppConfigured: () => true,
  sendWhatsApp: (...a: unknown[]) => mockSend(...a),
}))
vi.mock('@/lib/logger', () => ({ log: vi.fn(), logError: vi.fn() }))

// A tiny query recorder: enough of the builder for what the route does.
function builder(table: string) {
  const filters: Record<string, unknown> = {}
  let op: 'select' | 'update' | 'insert' = 'select'
  let row: Record<string, any> = {}
  const chain: Record<string, any> = {}
  const result = () => {
    if (table === 'invoices' && op === 'select') return { data: invoices.filter(i => (filters.id as string[]).includes(i.id)), error: null }
    if (table === 'invoices' && op === 'update') {
      updates.push({ table, row, filters })
      if (filters.status === 'draft') {
        if (claimed.has(filters.id as string)) return { data: [], error: null }
        claimed.add(filters.id as string); return { data: [{ id: filters.id }], error: null }
      }
      if (row.status === 'draft') claimed.delete(filters.id as string)
      return { data: null, error: null }
    }
    if (table === 'invoice_sends' && op === 'select') return { data: recentSends, error: null }
    if (table === 'reminders') return { data: recentReminders, error: null }
    if (table === 'invoice_sends' && op === 'insert') { inserts.push({ table, row }); return { data: { id: `send-${inserts.length}` }, error: null } }
    if (table === 'invoice_sends' && op === 'update') { updates.push({ table, row, filters }); return { data: null, error: null } }
    return { data: null, error: null }
  }
  chain.select = () => chain
  chain.update = (r: Record<string, any>) => { op = 'update'; row = r; return chain }
  chain.insert = (r: Record<string, any>) => { op = 'insert'; row = r; return chain }
  chain.eq = (k: string, v: unknown) => { filters[k] = v; return chain }
  chain.neq = () => chain
  chain.gte = () => chain
  chain.limit = () => chain
  chain.in = (k: string, v: unknown) => { filters[k] = v; return chain }
  chain.single = async () => result()
  chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(result()).then(ok)
  return chain
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: builder }),
  createServiceClient: () => ({ from: builder }),
}))

const post = (ids: unknown) => new NextRequest('http://localhost/api/invoices/bulk-send', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_ids: ids }),
})
const draft = (id: string, phone: string | null, extra: Record<string, any> = {}) => ({
  id, invoice_number: `INV-${id}`, status: 'draft', client_name: `Parent ${id}`, client_phone: phone,
  total: 342, currency: 'P', due_date: '2026-12-13', public_token: `tok-${id}`, billed_for: 'Thabo', project: 'November fees', invoice_payments: [], ...extra,
})

describe('POST /api/invoices/bulk-send', () => {
  beforeEach(() => {
    plan = 'business'; invoices = []; recentSends = []; recentReminders = []
    claimed.clear(); updates.length = 0; inserts.length = 0
    mockSend.mockReset().mockResolvedValue({ messages: [{ id: 'wamid.1' }] })
    mockSchedule.mockClear(); mockRate.mockClear().mockResolvedValue(true)
    vi.stubEnv('WHATSAPP_INVOICE_TEMPLATE', 'invoice_ready')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://getstagepay.co')
    vi.stubEnv('WHATSAPP_DAILY_RECIPIENTS', '250')
    vi.stubEnv('WHATSAPP_RESERVED_FOR_REMINDERS', '25')
  })

  it('is for the Business plan', async () => {
    plan = 'pro'
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    const res = await POST(post(['a']))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ upgrade: true })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('says so when the invoice template is not set up yet, and sends nothing', async () => {
    vi.stubEnv('WHATSAPP_INVOICE_TEMPLATE', '')
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    expect((await POST(post(['a']))).status).toBe(503)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('sends each draft with the template and a View button, skips the rest, and books reminders', async () => {
    invoices = [
      draft('a', '71 234 567'),
      draft('b', null),
      draft('c', '+267 72 000 000', { status: 'sent' }),
      draft('d', '73 000 000', { status: 'paid' }),
    ]
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    const res = await POST(post(['a', 'b', 'c', 'd', 'zzz']))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
    expect(body.results).toEqual([
      { id: 'a', number: 'INV-a', client: 'Parent a', outcome: 'sent' },
      { id: 'b', number: 'INV-b', client: 'Parent b', outcome: 'skipped', reason: 'No WhatsApp number' },
      { id: 'c', number: 'INV-c', client: 'Parent c', outcome: 'skipped', reason: 'Already sent' },
      { id: 'd', number: 'INV-d', client: 'Parent d', outcome: 'skipped', reason: 'Already paid' },
      { id: 'zzz', number: null, client: null, outcome: 'failed', reason: 'Not found' },
    ])
    // Local Botswana number got its country code; the message is the approved template with the token on the button.
    expect(mockSend).toHaveBeenCalledOnce()
    const [to, msg] = mockSend.mock.calls[0]
    expect(to).toBe('26771234567')
    expect(msg.template).toEqual({ name: 'invoice_ready', params: ['Thuto Tuition Centre', 'INV-a', 'P342.00', 'Student: Thabo · November fees', '13 Dec 2026'], buttonParams: ['tok-a'] })
    // Claimed draft→sent before sending, with when and how.
    const claim = updates.find(u => u.table === 'invoices' && u.filters.id === 'a' && u.filters.status === 'draft')
    expect(claim?.row).toMatchObject({ status: 'sent', sent_via: 'whatsapp' })
    expect(claim?.row.sent_at).toBeTruthy()
    // The send is on record with Meta's message id, and reminders start.
    expect(inserts[0].row).toMatchObject({ invoice_id: 'a', user_id: 'acct-1', recipient: '26771234567', status: 'queued' })
    expect(updates.find(u => u.table === 'invoice_sends')?.row).toMatchObject({ status: 'sent', provider_message_id: 'wamid.1' })
    expect(mockSchedule).toHaveBeenCalledWith('acct-1', 'a', 'user-1')
  })

  it('never sends an invoice twice: the second claim finds it already sent', async () => {
    invoices = [draft('a', '71234567')]
    claimed.add('a')
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    const body = await (await POST(post(['a']))).json()
    expect(body.results[0]).toMatchObject({ outcome: 'skipped', reason: 'Already sent' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('puts a failed send back to draft and explains in plain words', async () => {
    invoices = [draft('a', '71234567')]
    mockSend.mockRejectedValue(new Error('(#131026) Message Undeliverable'))
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    const body = await (await POST(post(['a']))).json()
    expect(body.results[0]).toMatchObject({ outcome: 'failed', reason: 'This number is not on WhatsApp' })
    const revert = updates.find(u => u.table === 'invoices' && u.row.status === 'draft')
    expect(revert?.row).toEqual({ status: 'draft', sent_at: null, sent_via: null })
    expect(updates.find(u => u.table === 'invoice_sends' && u.row.status === 'failed')?.row.error).toContain('131026')
    expect(mockSchedule).not.toHaveBeenCalled()
  })

  it('stops at WhatsApp’s daily limit for new numbers, counting reminders and other accounts’ sends', async () => {
    vi.stubEnv('WHATSAPP_DAILY_RECIPIENTS', '30')
    vi.stubEnv('WHATSAPP_RESERVED_FOR_REMINDERS', '2')
    // 27 numbers reached in the last 24h (some by reminders) leaves room for one more new number.
    recentSends = Array.from({ length: 20 }, (_, i) => ({ recipient: `2677100000${i}` }))
    recentReminders = Array.from({ length: 7 }, (_, i) => ({ recipient_phone: `7200000${i}` }))
    invoices = [draft('a', '71234567'), draft('b', '71234568'), draft('c', '72000001')] // c was reminded today: no new number
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    const body = await (await POST(post(['a', 'b', 'c']))).json()
    expect(body.capReached).toBe(true)
    expect(body.results.map((r: any) => r.outcome)).toEqual(['sent', 'skipped', 'sent'])
    expect(body.results[1].reason).toBe('Daily WhatsApp limit reached')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('refuses more than 25 ids in one request and rate-limits the account', async () => {
    const { POST } = await import('@/app/api/invoices/bulk-send/route')
    expect((await POST(post(Array.from({ length: 26 }, (_, i) => `i${i}`)))).status).toBe(400)
    expect((await POST(post([]))).status).toBe(400)
    mockRate.mockResolvedValue(false)
    expect((await POST(post(['a']))).status).toBe(429)
  })
})
