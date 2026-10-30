// What each plan costs and includes, as the app actually enforces it.
// Prices must match what DPO charges in lib/dpo.ts.
export const FREE_MONTHLY_LIMIT = 2
export const TEAM_SEATS = 5

export type PlanId = 'free' | 'pro' | 'business'

export const PLANS: { id: PlanId; name: string; price: number; includes: string }[] = [
  { id: 'free',     name: 'Free',     price: 0,   includes: `Up to ${FREE_MONTHLY_LIMIT} invoices a month` },
  { id: 'pro',      name: 'Pro',      price: 100, includes: 'Unlimited invoices' },
  { id: 'business', name: 'Business', price: 400, includes: `Unlimited invoices. Shared team accounts for up to ${TEAM_SEATS} people coming soon` },
]

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

// What one payment costs, in whole Pula: the monthly price times the months, less the discount.
export function periodPrice(monthly: number, months: Months) {
  return Math.round(monthly * months * (100 - period(months).off) / 100)
}

export function planName(id: string | null | undefined) {
  return PLANS.find(p => p.id === id)?.name ?? 'Free'
}
