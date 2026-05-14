const DPO_API = 'https://secure.3gdirectpay.com/API/v6/'
const DPO_PAY = 'https://secure.3gdirectpay.com/payv2.php'

export type DpoPlan = 'pro' | 'business'

const PLAN_CONFIG: Record<DpoPlan, { amount: string; description: string }> = {
  pro:      { amount: '200.00', description: 'Stagepay Pro Plan — Monthly Subscription' },
  business: { amount: '500.00', description: 'Stagepay Business Plan — Monthly Subscription' },
}

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

export async function createPaymentToken(
  userId: string,
  plan: DpoPlan,
): Promise<{ token: string; paymentUrl: string }> {
  const { amount, description } = PLAN_CONFIG[plan]
  const serviceDate = new Date().toISOString().split('T')[0]
  const companyRef = `stagepay-${plan}-${userId}-${Date.now()}`

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken()}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>BWP</PaymentCurrency>
    <CompanyRef>${companyRef}</CompanyRef>
    <RedirectURL>${appUrl()}/api/billing/verify</RedirectURL>
    <BackURL>${appUrl()}/api/billing/callback</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>30</PTL>
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
  return { token, paymentUrl: `${DPO_PAY}?ID=${token}` }
}

export async function verifyPaymentToken(
  transactionToken: string,
): Promise<{ success: boolean; ref: string; result: string }> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken()}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${transactionToken}</TransactionToken>
</API3G>`

  const response = await callDpo(xml)
  const result = extractTag(response, 'Result')
  const ref = extractTag(response, 'TransactionRef')

  return { success: result === '000', ref, result }
}
