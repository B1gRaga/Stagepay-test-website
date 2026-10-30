import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { confirmPlanUpgrade, planCharge } from '@/lib/dpo'

const DAY = 86_400_000
const NOW = new Date('2026-10-20T10:00:00Z').getTime()

// A stand-in for the Supabase client that returns `current` for the read and
// records the update with every filter applied to it.
function fakeClient(current: { plan: string; subscription_expires_at: string | null; pending_months?: number | null }) {
  const writes: { values: Record<string, unknown>; filters: unknown[][] }[] = []
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: current }) }) }),
      update: (values: Record<string, unknown>) => {
        const w = { values, filters: [] as unknown[][] }
        writes.push(w)
        const chain = {
          eq: (...a: unknown[]) => { w.filters.push(['eq', ...a]); return chain },
          not: (...a: unknown[]) => { w.filters.push(['not', ...a]); return chain },
        }
        return chain
      },
    }),
  }
  return { client: client as never, writes }
}

describe('confirmPlanUpgrade', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
  afterEach(() => vi.useRealTimers())

  it('gives 30 days from today to a new subscriber', async () => {
    const { client, writes } = fakeClient({ plan: 'free', subscription_expires_at: null })
    await confirmPlanUpgrade(client, 'u1', 'pro', 'tok')
    expect(writes[0].values).toEqual({ plan: 'pro', subscription_expires_at: new Date(NOW + 30 * DAY).toISOString(), pending_plan: null, pending_months: null })
  })

  it('gives 183 days for six months and 365 for a year', async () => {
    const six = fakeClient({ plan: 'free', subscription_expires_at: null, pending_months: 6 })
    await confirmPlanUpgrade(six.client, 'u1', 'pro', 'tok')
    expect(six.writes[0].values.subscription_expires_at).toBe(new Date(NOW + 183 * DAY).toISOString())

    const end = NOW + 3 * DAY
    const year = fakeClient({ plan: 'pro', subscription_expires_at: new Date(end).toISOString(), pending_months: 12 })
    await confirmPlanUpgrade(year.client, 'u1', 'pro', 'tok')
    expect(year.writes[0].values.subscription_expires_at).toBe(new Date(end + 365 * DAY).toISOString())
  })

  it('adds 30 days to the current end when renewing the same plan early', async () => {
    const end = NOW + 3 * DAY
    const { client, writes } = fakeClient({ plan: 'pro', subscription_expires_at: new Date(end).toISOString() })
    await confirmPlanUpgrade(client, 'u1', 'pro', 'tok')
    expect(writes[0].values.subscription_expires_at).toBe(new Date(end + 30 * DAY).toISOString())
  })

  it('starts from today when the plan has already ended or changes', async () => {
    const lapsed = fakeClient({ plan: 'pro', subscription_expires_at: new Date(NOW - DAY).toISOString() })
    await confirmPlanUpgrade(lapsed.client, 'u1', 'pro', 'tok')
    expect(lapsed.writes[0].values.subscription_expires_at).toBe(new Date(NOW + 30 * DAY).toISOString())

    const upgrade = fakeClient({ plan: 'pro', subscription_expires_at: new Date(NOW + 10 * DAY).toISOString() })
    await confirmPlanUpgrade(upgrade.client, 'u1', 'business', 'tok')
    expect(upgrade.writes[0].values.subscription_expires_at).toBe(new Date(NOW + 30 * DAY).toISOString())
  })

  it('charges 5% less for six months and 10% less for a year', () => {
    expect(planCharge('pro')).toEqual({ amount: '100.00', description: 'Stagepay Pro Plan — Monthly' })
    expect(planCharge('pro', 6).amount).toBe('570.00')
    expect(planCharge('pro', 12)).toEqual({ amount: '1080.00', description: 'Stagepay Pro Plan — 1 year' })
    expect(planCharge('business', 6).amount).toBe('2280.00')
    expect(planCharge('business', 12).amount).toBe('4320.00')
  })

  it('only applies while this payment is still pending', async () => {
    const { client, writes } = fakeClient({ plan: 'free', subscription_expires_at: null })
    await confirmPlanUpgrade(client, 'u1', 'pro', 'tok-123')
    expect(writes[0].filters).toEqual([
      ['eq', 'id', 'u1'],
      ['eq', 'dpo_transaction_ref', 'tok-123'],
      ['not', 'pending_plan', 'is', null],
    ])
  })
})
