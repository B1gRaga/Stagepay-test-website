import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dpo } from '@/lib/billing/dpo'

// DPO sends the customer's browser to RedirectURL after paying and to BackURL
// when they cancel. Both must be pages a signed-in browser can open.
describe('dpo provider', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    process.env.DPO_COMPANY_TOKEN = 'company'
    process.env.DPO_SERVICE_TYPE = '1'
    process.env.NEXT_PUBLIC_APP_URL = 'https://getstagepay.co'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset().mockResolvedValue(new Response('<API3G><Result>000</Result><TransToken>TOK1</TransToken></API3G>'))
  })
  afterEach(() => vi.unstubAllGlobals())

  const checkout = { userId: 'user-1', plan: 'pro' as const, months: 1 as const, currency: 'BWP' as const, amount: '100.00', description: 'Stagepay Pro Plan — Monthly' }

  it('sends paid customers to verify and cancelled ones back to Settings', async () => {
    const { ref, paymentUrl } = await dpo.createCheckout(checkout)
    const xml = String(fetchMock.mock.calls[0][1].body)
    expect(xml).toContain('<RedirectURL>https://getstagepay.co/api/billing/verify</RedirectURL>')
    expect(xml).toContain('<BackURL>https://getstagepay.co/settings?billing=cancelled</BackURL>')
    expect(ref).toBe('TOK1')
    expect(paymentUrl).toContain('ID=TOK1')
  })

  it('charges the amount and currency it is given, and gives the customer 30 minutes', async () => {
    await dpo.createCheckout({ ...checkout, amount: '570.00' })
    const xml = String(fetchMock.mock.calls[0][1].body)
    expect(xml).toContain('<PaymentAmount>570.00</PaymentAmount>')
    expect(xml).toContain('<PaymentCurrency>BWP</PaymentCurrency>')
    expect(xml).toContain('<PTL>30</PTL>')
    expect(dpo.ttlMs).toBe(30 * 60_000)
  })

  it('reads the reference back from DPO’s TransactionToken parameter', () => {
    expect(dpo.returnParam).toBe('TransactionToken')
  })

  it('charges only Pula until DPO_CURRENCIES says the account takes more', () => {
    delete process.env.DPO_CURRENCIES
    expect(dpo.currencies).toEqual(['BWP'])
    process.env.DPO_CURRENCIES = 'bwp, zar,USD'
    expect(dpo.currencies).toEqual(['BWP', 'ZAR', 'USD'])
    // Pula stays in as the fallback even when left off; junk is ignored.
    process.env.DPO_CURRENCIES = 'ZAR,rand,,12'
    expect(dpo.currencies).toEqual(['BWP', 'ZAR'])
    delete process.env.DPO_CURRENCIES
  })

  it('confirms a payment only on result 000', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<API3G><Result>000</Result><TransactionRef>R1</TransactionRef></API3G>'))
    expect((await dpo.verify('TOK1')).success).toBe(true)
    fetchMock.mockResolvedValueOnce(new Response('<API3G><Result>901</Result></API3G>'))
    expect(await dpo.verify('TOK1')).toEqual({ success: false, detail: '901' })
  })

  it('fails clearly when DPO isn’t configured', async () => {
    delete process.env.DPO_COMPANY_TOKEN
    await expect(dpo.createCheckout(checkout)).rejects.toThrow('DPO_COMPANY_TOKEN is not set')
  })
})
