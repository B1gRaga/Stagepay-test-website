import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { paymentDetailsChangedEmail, sameMethods, describeMethod } from '@/lib/emails/payment-details-changed'

// The owner is emailed whenever the payment details on their invoices change,
// so a swapped-in bank account (account takeover) doesn't go unnoticed.

const BANK = { kind: 'bank', bank: 'FNB Botswana', account_name: 'Kago Tutors', number: '62012345678', branch_code: '281467' }
const NEW_BANK = { ...BANK, number: '62099990000' }

let stored: Record<string, unknown> = {}
const notify = vi.fn()

vi.mock('@/lib/notify-payment-change', () => ({ notifyPaymentDetailsChanged: (o: unknown) => notify(o) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-user-email': 'admin@kago.bw' }) }))
vi.mock('@/lib/account', () => ({
  getAccount: async () => ({ userId: 'user-2', accountId: 'acct-1', role: 'admin' }),
  canManage: () => true,
  accountProfileClient: async () => ({
    from: () => {
      let pending: Record<string, unknown> | null = null
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.update = (row: Record<string, unknown>) => { pending = row; return chain }
      chain.single = async () => {
        if (pending) { stored = { ...stored, ...pending }; pending = null }
        return { data: { ...stored }, error: null }
      }
      return chain
    },
  }),
}))

function save(body: unknown) {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  notify.mockClear()
  stored = { firm_name: 'Kago Tutors', payment_methods: [BANK] }
})

describe('payment details change alert', () => {
  it('emails the owner when the bank account changes', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const res = await PATCH(save({ payment_methods: [NEW_BANK] }))
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acct-1', businessName: 'Kago Tutors', changedBy: 'admin@kago.bw',
    }))
  })

  it('stays quiet when the same details are saved again', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    await PATCH(save({ payment_methods: [BANK] }))
    expect(notify).not.toHaveBeenCalled()
  })

  it('stays quiet for changes that are not payment details', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    await PATCH(save({ firm_name: 'Kago Tutoring' }))
    expect(notify).not.toHaveBeenCalled()
  })
})

describe('the alert email', () => {
  it('shows only the last four digits of account numbers', () => {
    expect(describeMethod(NEW_BANK as never)).toBe('FNB Botswana · Kago Tutors · ••••0000')
    const { text, subject } = paymentDetailsChangedEmail({
      businessName: 'Kago Tutors', changedBy: 'admin@kago.bw', methods: [NEW_BANK as never], when: new Date('2026-11-14T10:00:00Z'),
    })
    expect(subject).toBe('Your payment details were changed')
    expect(text).toContain('admin@kago.bw')
    expect(text).not.toContain('62099990000')
    expect(text).toMatch(/didn’t make this change/)
  })

  it('treats a re-ordered list as a change', () => {
    const wallet = { kind: 'orange', number: '71234567' }
    expect(sameMethods([BANK, wallet], [BANK, wallet])).toBe(true)
    expect(sameMethods([BANK, wallet], [wallet, BANK])).toBe(false)
  })
})
