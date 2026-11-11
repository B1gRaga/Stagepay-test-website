// What a plan costs, in each currency StagePay can be paid in.
import { currencyCode } from '@/lib/currencies'
import { periodPrice, planName, type Months, type PlanId } from '@/lib/plans'

export type PaidPlan = Exclude<PlanId, 'free'>

// Currencies a plan can be paid in. Adding one means a row in PRICES and
// BILLING_CURRENCIES here, and a provider that can charge it (lib/billing/provider.ts).
export type BillingCurrency = 'BWP'

export const BILLING_CURRENCIES: Record<BillingCurrency, { symbol: string; name: string }> = {
  BWP: { symbol: 'P', name: 'Pula' },
}

// Monthly prices. Settings and the landing page show these; checkout charges them.
export const PRICES: Record<BillingCurrency, Record<PaidPlan, number>> = {
  BWP: { pro: 100, business: 400 },
}

export const DEFAULT_BILLING_CURRENCY: BillingCurrency = 'BWP'

function isBillingCurrency(code: string): code is BillingCurrency {
  return Object.hasOwn(PRICES, code)
}

// The currency a business pays StagePay in: the one its invoices are made out
// in, when there's a price list for it and the provider can charge it; else Pula.
export function billingCurrencyFor(defaultCurrency: string | null | undefined, chargeable: readonly string[]): BillingCurrency {
  const code = currencyCode(defaultCurrency)
  return isBillingCurrency(code) && chargeable.includes(code) ? code : DEFAULT_BILLING_CURRENCY
}

export function monthlyPrice(plan: PlanId, currency: BillingCurrency) {
  return plan === 'free' ? 0 : PRICES[currency][plan]
}

// One payment: the amount the way providers want it ("570.00"), its currency,
// and the line that appears on their payment page.
export function planCharge(plan: PaidPlan, months: Months, currency: BillingCurrency) {
  const length = months === 1 ? 'Monthly' : months === 12 ? '1 year' : `${months} months`
  return {
    amount: periodPrice(monthlyPrice(plan, currency), months).toFixed(2),
    currency,
    description: `Stagepay ${planName(plan)} Plan — ${length}`,
  }
}
