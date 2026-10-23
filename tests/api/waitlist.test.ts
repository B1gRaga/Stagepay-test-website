import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The waitlist is public, so every field is checked on the server; a bad
// referral code from a shared link is dropped instead of failing the signup.
const inserts: Record<string, unknown>[] = []
let insertError: { code: string; message: string } | null = null

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => true }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row)
        return { select: () => ({ single: async () => insertError ? { data: null, error: insertError } : { data: { referral_code: 'a1b2c3d4' }, error: null } }) }
      },
    }),
  }),
}))

const valid = {
  full_name: 'Neo Kgosi', whatsapp: '+267 71 234 567', email: '',
  business_type: 'salon', town: 'Maun', current_method: 'paper', would_pay: 'yes',
  note: 'Clients forget to pay', consent: true, source: 'flyer-maun', referred_by: 'deadbeef',
}
const post = (body: unknown) => new NextRequest('http://localhost/api/waitlist', { method: 'POST', body: JSON.stringify(body) })

describe('Joining the waitlist', () => {
  beforeEach(() => { inserts.length = 0; insertError = null })

  it('saves a valid signup and returns the referral code', async () => {
    const { POST } = await import('@/app/api/waitlist/route')
    const res = await POST(post(valid))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ success: true, referral_code: 'a1b2c3d4' })
    expect(inserts[0]).toMatchObject({ whatsapp: '+26771234567', town: 'Maun', would_pay: 'yes', referred_by: 'deadbeef', source: 'flyer-maun', email: null })
  })

  it('drops a malformed referral code instead of refusing', async () => {
    const { POST } = await import('@/app/api/waitlist/route')
    expect((await POST(post({ ...valid, referred_by: '<script>' }))).status).toBe(201)
    expect(inserts[0].referred_by).toBeNull()
  })

  it.each([
    ['business_type', 'Solo tutor'],
    ['town', 'Johannesburg'],
    ['current_method', 'fax'],
    ['would_pay', 'maybe'],
    ['whatsapp', '12'],
    ['consent', false],
  ])('refuses a bad %s without saving', async (field, value) => {
    const { POST } = await import('@/app/api/waitlist/route')
    expect((await POST(post({ ...valid, [field]: value }))).status).toBe(400)
    expect(inserts).toEqual([])
  })

  it('tells a returning number it is already on the list', async () => {
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint "waitlist_signups_whatsapp_key"' }
    const { POST } = await import('@/app/api/waitlist/route')
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ alreadyExists: true })
  })
})
