import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { PLANS, period, periodPrice, type Months } from '@/lib/plans'

const DPO_API = 'https://secure.3gdirectpay.com/API/v6/'
const DPO_PAY = 'https://secure.3gdirectpay.com/payv2.php'

export type DpoPlan = 'pro' | 'business'

// What DPO charges for a plan over a period; prices come from lib/plans.ts
export function planCharge(plan: DpoPlan, months: Months = 1) {
  const p = PLANS.find(x => x.id === plan)!
  const length = months === 1 ? 'Monthly' : months === 12 ? '1 year' : `${months} months`
  return {
    amount: periodPrice(p.price, months).toFixed(2),
    description: `Stagepay ${p.name} Plan — ${length}`,
  }
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
  months: Months = 1,
): Promise<{ token: string; paymentUrl: string }> {
  const { amount, description } = planCharge(plan, months)
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

// Shared by /api/billing/verify, /api/billing/callback, and the
// billing-reconcile cron — all three confirm a DPO payment the same way.
// Each payment buys the period chosen at checkout (pending_months): 30 days,
// 183 days or 365 days. Paying again for the same plan before it ends adds
// the days to the current end date, so renewing early loses nothing.
// The update only applies while this payment is still pending, so when two of
// the callers confirm the same payment at once, Postgres lets only one through.
export async function confirmPlanUpgrade(
  serviceClient: SupabaseClient<Database>,
  userId: string,
  plan: DpoPlan,
  transactionToken: string,
): Promise<void> {
  const { data: current } = await serviceClient
    .from('profiles')
    .select('plan, subscription_expires_at, pending_months')
    .eq('id', userId)
    .single()

  const now = Date.now()
  const currentEnd = current?.subscription_expires_at ? new Date(current.subscription_expires_at).getTime() : 0
  const from = current?.plan === plan && currentEnd > now ? currentEnd : now
  const days = period(current?.pending_months).days
  const expiresAt = new Date(from + days * 24 * 60 * 60 * 1000).toISOString()

  await serviceClient
    .from('profiles')
    .update({
      plan,
      subscription_expires_at: expiresAt,
      pending_plan: null,
      pending_months: null,
    })
    .eq('id', userId)
    .eq('dpo_transaction_ref', transactionToken)
    .not('pending_plan', 'is', null)
}
