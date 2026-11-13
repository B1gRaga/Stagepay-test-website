// What each plan includes and how long a payment lasts, as the app enforces it.
// Prices, per currency, are in lib/billing/pricing.ts.
export const FREE_MONTHLY_LIMIT = 3
export const TEAM_SEATS = 5

// The free allowance resets on the 1st, UTC, as account_can_add_invoice() counts it.
export function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export type PlanId = 'free' | 'pro' | 'business'

export const PLANS: { id: PlanId; name: string; includes: string }[] = [
  { id: 'free',     name: 'Free',     includes: `Up to ${FREE_MONTHLY_LIMIT} invoices a month` },
  { id: 'pro',      name: 'Pro',      includes: 'Unlimited invoices' },
  { id: 'business', name: 'Business', includes: `Unlimited invoices. A shared team account for up to ${TEAM_SEATS} people, and a whole class sent on WhatsApp in one tap` },
]

// Sending a whole class on WhatsApp goes out from StagePay's own number, and
// each message costs StagePay money, so it comes with the Business plan.
export const BULK_SEND_PLANS: readonly PlanId[] = ['business']
export function canBulkSend(plan: string | null | undefined) {
  return BULK_SEND_PLANS.includes((plan ?? 'free') as PlanId)
}

// How long one payment covers. Paying for longer up front costs less per month.
export type Months = 1 | 6 | 12

export const PERIODS: { months: Months; label: string; off: number; days: number }[] = [
  { months: 1,  label: 'Monthly',  off: 0,  days: 30 },
  { months: 6,  label: '6 months', off: 5,  days: 183 },
  { months: 12, label: 'Yearly',   off: 10, days: 365 },
]

export function period(months: number | null | undefined) {
  return PERIODS.find(p => p.months === months) ?? PERIODS[0]
}

// What one payment costs, in whole units of the currency: the monthly price times the months, less the discount.
export function periodPrice(monthly: number, months: Months) {
  return Math.round(monthly * months * (100 - period(months).off) / 100)
}

export function planName(id: string | null | undefined) {
  return PLANS.find(p => p.id === id)?.name ?? 'Free'
}
