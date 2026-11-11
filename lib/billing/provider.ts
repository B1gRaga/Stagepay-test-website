// Who takes plan payments. Each provider is one file here that turns a plan,
// a period and a currency into a payment page, and later confirms the payment.
//
// BILLING_PROVIDER picks the one new payments go to: 'dpo' (the default) or
// 'realpay' (lib/billing/realpay.ts, once StagePay is registered and has its
// RealPay keys). Payments already started stay with the provider that started
// them: checkout writes profiles.pending_provider, and verify and the
// billing-reconcile cron read it.
import { logWarn } from '@/lib/logger'
import type { Months } from '@/lib/plans'
import type { BillingCurrency, PaidPlan } from './pricing'
import { dpo } from './dpo'
import { realpay } from './realpay'

export type ProviderId = 'dpo' | 'realpay'

export type Checkout = {
  userId: string
  plan: PaidPlan
  months: Months
  currency: BillingCurrency
  amount: string       // "570.00"
  description: string  // the line on the provider's payment page
}

export type PaymentProvider = {
  id: ProviderId
  name: string                  // as people see it: in Settings and the privacy notice
  where: string                 // where it handles the payment, for the privacy notice
  currencies: readonly string[] // ISO codes it can charge; only those with a price list are used
  returnParam: string           // query parameter carrying the reference when the customer is sent back
  ttlMs: number                 // how long a started payment can still be completed
  createCheckout(c: Checkout): Promise<{ ref: string; paymentUrl: string }>
  verify(ref: string): Promise<{ success: boolean; detail?: string }>
}

const PROVIDERS: Record<ProviderId, PaymentProvider> = { dpo, realpay }

function isProviderId(v: unknown): v is ProviderId {
  return v === 'dpo' || v === 'realpay'
}

// The provider new payments go to. A misspelt BILLING_PROVIDER falls back to
// DPO with a warning, rather than taking Settings down.
let warned = false
export function activeProvider(): PaymentProvider {
  const want = process.env.BILLING_PROVIDER ?? 'dpo'
  if (isProviderId(want)) return PROVIDERS[want]
  if (!warned) {
    warned = true
    logWarn('billing.unknown_provider', { want })
  }
  return dpo
}

// The provider a pending payment was started with. Payments from before
// pending_provider existed were all DPO.
export function providerById(id: string | null | undefined): PaymentProvider {
  return isProviderId(id) ? PROVIDERS[id] : dpo
}

// The payment reference in the URL a customer is sent back to, whichever
// provider sent them.
export function returnedRef(params: URLSearchParams): string | null {
  for (const p of Object.values(PROVIDERS)) {
    const v = params.get(p.returnParam)
    if (v) return v
  }
  return null
}
