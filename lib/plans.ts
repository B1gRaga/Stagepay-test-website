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

export function planName(id: string | null | undefined) {
  return PLANS.find(p => p.id === id)?.name ?? 'Free'
}
