// DPO Pay: the provider StagePay launched with. One-off payments by card or
// mobile money on DPO's hosted page; no stored cards, so no auto-renewal.
import type { Checkout, PaymentProvider } from './provider'

const DPO_API = 'https://secure.3gdirectpay.com/API/v6/'
const DPO_PAY = 'https://secure.3gdirectpay.com/payv2.php'

// How long a payment token stays valid on DPO's side (PTL, in minutes).
const TTL_MINUTES = 30

function companyToken() {
  const t = process.env.DPO_COMPANY_TOKEN
  if (!t) throw new Error('DPO_COMPANY_TOKEN is not set')
  return t
}

function serviceType() {
  const t = process.env.DPO_SERVICE_TYPE
  if (!t) throw new Error('DPO_SERVICE_TYPE is not set')
  return t
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

async function callDpo(xml: string): Promise<string> {
  const res = await fetch(DPO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml,
  })
  if (!res.ok) throw new Error(`DPO API error: ${res.status}`)
  return res.text()
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))
  return m ? m[1] : ''
}

async function createCheckout({ userId, plan, currency, amount, description }: Checkout) {
  const serviceDate = new Date().toISOString().split('T')[0]
  const companyRef = `stagepay-${plan}-${userId}-${Date.now()}`

  // RedirectURL is where DPO sends a paid customer (with ?TransactionToken=);
  // BackURL is its "cancel" link for the customer's browser, so it goes to
  // Settings, not to an API route.
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken()}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>${currency}</PaymentCurrency>
    <CompanyRef>${companyRef}</CompanyRef>
    <RedirectURL>${appUrl()}/api/billing/verify</RedirectURL>
    <BackURL>${appUrl()}/settings?billing=cancelled</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>${TTL_MINUTES}</PTL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${serviceType()}</ServiceType>
      <ServiceDescription>${description}</ServiceDescription>
      <ServiceDate>${serviceDate}</ServiceDate>
    </Service>
  </Services>
</API3G>`

  const response = await callDpo(xml)
  const result = extractTag(response, 'Result')
  if (result !== '000') {
    const explanation = extractTag(response, 'ResultExplanation')
    throw new Error(`DPO createToken failed: ${explanation} (${result})`)
  }

  const token = extractTag(response, 'TransToken')
  return { ref: token, paymentUrl: `${DPO_PAY}?ID=${token}` }
}

async function verify(ref: string) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken()}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${ref}</TransactionToken>
</API3G>`

  const response = await callDpo(xml)
  const result = extractTag(response, 'Result')
  return { success: result === '000', detail: result }
}

export const dpo: PaymentProvider = {
  id: 'dpo',
  name: 'DPO Pay',
  where: 'Kenya and Botswana',
  currencies: ['BWP'],
  returnParam: 'TransactionToken',
  ttlMs: TTL_MINUTES * 60_000,
  createCheckout,
  verify,
}
