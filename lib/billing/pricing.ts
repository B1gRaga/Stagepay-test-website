// What a plan costs, in each currency StagePay can be paid in.
import { CURRENCIES, currencyCode } from '@/lib/currencies'
import { periodPrice, planName, type Months, type PlanId } from '@/lib/plans'

export type PaidPlan = Exclude<PlanId, 'free'>

// Monthly prices, whole units of each currency (periodPrice rounds to whole
// units, so a price with cents would show one figure and charge another).
// Set 2026-11-11 from P100 / P400 at that day's rates, rounded to a clean
// figure within ±5% and keeping Business at 4× Pro. Settings shows these;
// checkout charges them. A business is charged in one of these only when the
// provider can take it (lib/billing/provider.ts `currencies`); otherwise Pula.
export const PRICES = {
  BWP: { pro: 100,   business: 400 },
  ZAR: { pro: 120,   business: 480 },
  USD: { pro: 7,     business: 28 },
  EUR: { pro: 6,     business: 24 },
  GBP: { pro: 5,     business: 20 },
  KES: { pro: 950,   business: 3800 },
  NGN: { pro: 10000, business: 40000 },
  GHS: { pro: 85,    business: 340 },
  AUD: { pro: 10,    business: 40 },
  AED: { pro: 26,    business: 104 },
} as const satisfies Record<string, Record<PaidPlan, number>>

export type BillingCurrency = keyof typeof PRICES

export const DEFAULT_BILLING_CURRENCY: BillingCurrency = 'BWP'

// Symbol and name for each billing currency, from the one invoice currency list.
export const BILLING_CURRENCIES = Object.fromEntries(
  (Object.keys(PRICES) as BillingCurrency[]).map(code => {
    const c = CURRENCIES.find(x => x.code === code)
    if (!c) throw new Error(`${code} has a price list but isn’t in lib/currencies.ts`)
    return [code, { symbol: c.symbol, name: c.name }]
  }),
) as Record<BillingCurrency, { symbol: string; name: string }>

function isBillingCurrency(code: string): code is BillingCurrency {
  return Object.hasOwn(PRICES, code)
}

// The currency a business pays StagePay in: the one its invoices are made out
// in, when there's a price list for it and the provider can charge it; else Pula.
export function billingCurrencyFor(defaultCurrency: string | null | undefined, chargeable: readonly string[]): BillingCurrency {
  const code = currencyCode(defaultCurrency)
  return isBillingCurrency(code) && chargeable.includes(code) ? code : DEFAULT_BILLING_CURRENCY
}

export function monthlyPrice(plan: PlanId, currency: BillingCurrency): number {
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
