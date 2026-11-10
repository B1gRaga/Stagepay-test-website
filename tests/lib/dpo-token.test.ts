import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPaymentToken } from '@/lib/dpo'

// DPO sends the customer's browser to RedirectURL after paying and to BackURL
// when they cancel. Both must be pages a signed-in browser can open.
describe('createPaymentToken', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    process.env.DPO_COMPANY_TOKEN = 'company'
    process.env.DPO_SERVICE_TYPE = '1'
    process.env.NEXT_PUBLIC_APP_URL = 'https://getstagepay.co'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset().mockResolvedValue(new Response('<API3G><Result>000</Result><TransToken>TOK1</TransToken></API3G>'))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends paid customers to verify and cancelled ones back to Settings', async () => {
    const { paymentUrl } = await createPaymentToken('user-1', 'pro')
    const xml = String(fetchMock.mock.calls[0][1].body)
    expect(xml).toContain('<RedirectURL>https://getstagepay.co/api/billing/verify</RedirectURL>')
    expect(xml).toContain('<BackURL>https://getstagepay.co/settings?billing=cancelled</BackURL>')
    expect(paymentUrl).toContain('ID=TOK1')
  })
})
