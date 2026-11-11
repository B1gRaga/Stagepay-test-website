import { describe, it, expect } from 'vitest'
import { billingCurrencyFor, monthlyPrice, planCharge, PRICES } from '@/lib/billing/pricing'
import { currencyCode } from '@/lib/currencies'

describe('currencyCode', () => {
  it('turns the symbol a profile stores into a code', () => {
    expect(currencyCode('P')).toBe('BWP')
    expect(currencyCode('R')).toBe('ZAR')
    expect(currencyCode('bwp')).toBe('BWP')
    expect(currencyCode('XYZ')).toBe('XYZ')
    expect(currencyCode(null)).toBe('')
  })
})

describe('billingCurrencyFor', () => {
  it('bills in Pula for a Pula business', () => {
    expect(billingCurrencyFor('P', ['BWP'])).toBe('BWP')
  })

  it('falls back to Pula when there is no price list for the invoice currency', () => {
    // Rand invoices, but no Rand prices yet: charged in Pula like everyone else.
    expect(billingCurrencyFor('R', ['BWP', 'ZAR'])).toBe('BWP')
    expect(billingCurrencyFor(undefined, ['BWP'])).toBe('BWP')
  })

  it('falls back to Pula when the provider can’t charge the currency', () => {
    expect(billingCurrencyFor('P', [])).toBe('BWP')
  })

  it('only knows currencies with a price list', () => {
    expect(Object.keys(PRICES)).toEqual(['BWP'])
  })
})

describe('planCharge', () => {
  it('charges 5% less for six months and 10% less for a year', () => {
    expect(planCharge('pro', 1, 'BWP')).toEqual({ amount: '100.00', currency: 'BWP', description: 'Stagepay Pro Plan — Monthly' })
    expect(planCharge('pro', 6, 'BWP').amount).toBe('570.00')
    expect(planCharge('pro', 12, 'BWP')).toEqual({ amount: '1080.00', currency: 'BWP', description: 'Stagepay Pro Plan — 1 year' })
    expect(planCharge('business', 6, 'BWP').amount).toBe('2280.00')
    expect(planCharge('business', 12, 'BWP').amount).toBe('4320.00')
  })

  it('matches the prices Settings and the landing page show', () => {
    expect(monthlyPrice('free', 'BWP')).toBe(0)
    expect(monthlyPrice('pro', 'BWP')).toBe(100)
    expect(monthlyPrice('business', 'BWP')).toBe(400)
  })
})
