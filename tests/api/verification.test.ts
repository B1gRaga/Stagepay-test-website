import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Business verification: a business sends its CIPA certificate; StagePay
// staff approve or decline it. Only approved businesses may send from
// StagePay's WhatsApp number.

let row: Record<string, unknown> | null = null
let role: 'owner' | 'admin' | 'member' = 'owner'
let userEmail = 'owner@kago.bw'
const uploads: string[] = []
const removed: string[] = []
const newSubmission = vi.fn()
const decision = vi.fn()

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-user-email': userEmail }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => true }))
vi.mock('@/lib/emails/verification', () => ({
  emailNewSubmission: (o: unknown) => newSubmission(o),
  emailDecision: (o: unknown) => decision(o),
}))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role }),
  canManage: (a: { role: string }) => a.role === 'owner' || a.role === 'admin',
  accountProfileClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { firm_name: 'Kago Tutors' } }) }) }) }),
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    storage: { from: () => ({
      upload: async (path: string) => { uploads.push(path); return { error: null } },
      remove: async (paths: string[]) => { removed.push(...paths); return { error: null } },
    }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      let pendingUpdate: Record<string, unknown> | null = null
      chain.select = () => chain
      chain.eq = () => chain
      chain.maybeSingle = async () => {
        if (pendingUpdate) { if (row) row = { ...row, ...pendingUpdate }; pendingUpdate = null; return { data: row ? { status: row.status } : null, error: null } }
        return { data: table === 'business_verifications' ? row : null, error: null }
      }
      chain.single = async () => ({ data: { firm_name: 'Kago Tutors' }, error: null })
      chain.upsert = async (r: Record<string, unknown>) => { row = { ...r }; return { error: null } }
      chain.update = (u: Record<string, unknown>) => { pendingUpdate = u; return chain }
      return chain
    },
  }),
}))

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0])

function submit(fields: Record<string, string>, file: File | null = new File([PDF], 'cert.pdf', { type: 'application/pdf' })) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  if (file) fd.set('certificate', file)
  return new NextRequest('http://localhost/api/verification', { method: 'POST', body: fd })
}
const GOOD = { registration_number: 'bw 0000 1234567', registered_name: 'Kago Tutors (Pty) Ltd', submitter_name: 'Neo Kgosi', submitter_role: 'Bursar' }

beforeEach(() => {
  row = null; role = 'owner'; userEmail = 'owner@kago.bw'
  uploads.length = 0; removed.length = 0; newSubmission.mockClear(); decision.mockClear()
  vi.stubEnv('STAGEPAY_ADMIN_EMAILS', 'getstagepay@gmail.com, nk@stagepay.test')
})

describe('sending the certificate', () => {
  it('saves it as waiting, privately, and tells StagePay', async () => {
    const { POST } = await import('@/app/api/verification/route')
    const res = await POST(submit(GOOD))
    expect(res.status).toBe(201)
    expect(row).toMatchObject({ status: 'pending', registration_number: 'BW00001234567', submitter_role: 'Bursar', account_id: 'acct-1' })
    expect(uploads[0]).toMatch(/^acct-1\/certificate-\d+\.pdf$/)
    expect(newSubmission).toHaveBeenCalledWith(expect.objectContaining({ registrationNumber: 'BW00001234567' }))
  })

  it('refuses a file that is not really a PDF or image', async () => {
    const { POST } = await import('@/app/api/verification/route')
    const fake = new File([new Uint8Array([0x4d, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], 'cert.pdf', { type: 'application/pdf' })
    const res = await POST(submit(GOOD, fake))
    expect(res.status).toBe(400)
    expect(uploads).toEqual([])
  })

  it('needs the registration number and a certificate', async () => {
    const { POST } = await import('@/app/api/verification/route')
    expect((await POST(submit({ ...GOOD, registration_number: '#' }))).status).toBe(400)
    expect((await POST(submit(GOOD, null))).status).toBe(400)
  })

  it('is for owners and admins, not team members', async () => {
    role = 'member'
    const { POST } = await import('@/app/api/verification/route')
    expect((await POST(submit(GOOD))).status).toBe(403)
  })
})

describe('reviewing', () => {
  const decide = (body: unknown) => new NextRequest('http://localhost/api/admin/verifications/acct-1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const params = { params: Promise.resolve({ accountId: 'acct-1' }) }

  it('is hidden from anyone who is not StagePay staff', async () => {
    row = { status: 'pending' }
    const { POST } = await import('@/app/api/admin/verifications/[accountId]/route')
    expect((await POST(decide({ decision: 'approve' }), params)).status).toBe(404)
    expect(row.status).toBe('pending')
  })

  it('approves, and emails the owner', async () => {
    row = { status: 'pending' }; userEmail = 'NK@stagepay.test'
    const { POST } = await import('@/app/api/admin/verifications/[accountId]/route')
    const res = await POST(decide({ decision: 'approve' }), params)
    expect(res.status).toBe(200)
    expect(row).toMatchObject({ status: 'approved', reviewed_by: 'NK@stagepay.test' })
    expect(decision).toHaveBeenCalledWith(expect.objectContaining({ approved: true, businessName: 'Kago Tutors' }))
  })

  it('needs a reason to decline', async () => {
    row = { status: 'pending' }; userEmail = 'getstagepay@gmail.com'
    const { POST } = await import('@/app/api/admin/verifications/[accountId]/route')
    expect((await POST(decide({ decision: 'decline' }), params)).status).toBe(400)
    const res = await POST(decide({ decision: 'decline', note: 'Name on the certificate doesn’t match CIPA' }), params)
    expect(res.status).toBe(200)
    expect(row).toMatchObject({ status: 'declined', decision_note: 'Name on the certificate doesn’t match CIPA' })
  })
})

describe('once approved', () => {
  it('cannot be sent again', async () => {
    row = { status: 'approved', registration_number: 'BW00001234567' }
    const { POST } = await import('@/app/api/verification/route')
    expect((await POST(submit(GOOD))).status).toBe(409)
  })
})
