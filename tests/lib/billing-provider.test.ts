import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  log: vi.fn(), logError: vi.fn(), logWarn: vi.fn(), cronitorPing: vi.fn(),
}))

describe('billing providers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('new payments go to DPO unless BILLING_PROVIDER says otherwise', async () => {
    const { activeProvider } = await import('@/lib/billing/provider')
    expect(activeProvider().id).toBe('dpo')
  })

  it('BILLING_PROVIDER=realpay switches new payments to RealPay', async () => {
    vi.stubEnv('BILLING_PROVIDER', 'realpay')
    const { activeProvider } = await import('@/lib/billing/provider')
    expect(activeProvider().id).toBe('realpay')
    expect(activeProvider().name).toBe('RealPay')
  })

  it('a misspelt BILLING_PROVIDER falls back to DPO with a warning, not an outage', async () => {
    vi.stubEnv('BILLING_PROVIDER', 'paypal')
    const { activeProvider } = await import('@/lib/billing/provider')
    const { logWarn } = await import('@/lib/logger')
    expect(activeProvider().id).toBe('dpo')
    expect(logWarn).toHaveBeenCalledWith('billing.unknown_provider', { want: 'paypal' })
  })

  it('a pending payment is confirmed with the provider that started it', async () => {
    vi.stubEnv('BILLING_PROVIDER', 'realpay')
    const { providerById } = await import('@/lib/billing/provider')
    expect(providerById('dpo').id).toBe('dpo')
    expect(providerById('realpay').id).toBe('realpay')
    // Payments from before pending_provider existed were all DPO.
    expect(providerById(null).id).toBe('dpo')
    expect(providerById('nonsense').id).toBe('dpo')
  })

  it('finds the reference in the return URL whichever provider sent the customer back', async () => {
    const { returnedRef } = await import('@/lib/billing/provider')
    expect(returnedRef(new URLSearchParams('TransactionToken=TOK1'))).toBe('TOK1')
    expect(returnedRef(new URLSearchParams('ref=rp-1'))).toBe('rp-1')
    expect(returnedRef(new URLSearchParams('plan=business'))).toBeNull()
  })

  it('every provider can charge Pula, the fallback currency', async () => {
    const { providerById } = await import('@/lib/billing/provider')
    for (const id of ['dpo', 'realpay']) expect(providerById(id).currencies).toContain('BWP')
  })

  it('RealPay refuses to take a payment until its keys are set, and says which are missing', async () => {
    const { realpay } = await import('@/lib/billing/realpay')
    const checkout = { userId: 'u', plan: 'pro' as const, months: 1 as const, currency: 'BWP' as const, amount: '100.00', description: 'x' }
    await expect(realpay.createCheckout(checkout)).rejects.toThrow('REALPAY_API_URL, REALPAY_API_KEY, REALPAY_MERCHANT_ID not set')
    await expect(realpay.verify('rp-1')).rejects.toThrow('RealPay isn’t set up')
  })

  it('RealPay with keys but no API wiring fails at checkout, never silently', async () => {
    vi.stubEnv('REALPAY_API_URL', 'https://sandbox.example')
    vi.stubEnv('REALPAY_API_KEY', 'k')
    vi.stubEnv('REALPAY_MERCHANT_ID', 'm')
    const { realpay } = await import('@/lib/billing/realpay')
    const checkout = { userId: 'u', plan: 'pro' as const, months: 1 as const, currency: 'BWP' as const, amount: '100.00', description: 'x' }
    await expect(realpay.createCheckout(checkout)).rejects.toThrow('isn’t wired up yet')
  })
})
