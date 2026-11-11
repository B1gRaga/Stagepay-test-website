import { describe, it, expect } from 'vitest'
import { BILLING_CURRENCIES, billingCurrencyFor, monthlyPrice, planCharge, PRICES, type BillingCurrency } from '@/lib/billing/pricing'
import { CURRENCIES, currencyCode } from '@/lib/currencies'

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

  it('bills a business in its own currency when the provider can charge it', () => {
    expect(billingCurrencyFor('R', ['BWP', 'ZAR'])).toBe('ZAR')
    expect(billingCurrencyFor('KES', ['BWP', 'KES'])).toBe('KES')
  })

  it('falls back to Pula when the provider can’t charge the currency', () => {
    // Rand invoices, but the provider only takes Pula: charged in Pula like everyone else.
    expect(billingCurrencyFor('R', ['BWP'])).toBe('BWP')
    expect(billingCurrencyFor(undefined, ['BWP'])).toBe('BWP')
    expect(billingCurrencyFor('P', [])).toBe('BWP')
  })

  it('falls back to Pula for a currency with no price list', () => {
    expect(billingCurrencyFor('XYZ', ['BWP', 'XYZ'])).toBe('BWP')
  })
})

describe('price lists', () => {
  const codes = Object.keys(PRICES) as BillingCurrency[]

  it('cover every currency an invoice can be made out in', () => {
    expect(codes.sort()).toEqual(CURRENCIES.map(c => c.code).slice().sort())
  })

  it('are whole units, since period totals are rounded to whole units', () => {
    for (const code of codes) {
      expect(Number.isInteger(PRICES[code].pro)).toBe(true)
      expect(Number.isInteger(PRICES[code].business)).toBe(true)
    }
  })

  it('keep Business at four times Pro everywhere, like the Pula prices', () => {
    for (const code of codes) expect(PRICES[code].business).toBe(PRICES[code].pro * 4)
  })

  it('show each currency with the symbol and name invoices use', () => {
    expect(BILLING_CURRENCIES.BWP).toEqual({ symbol: 'P', name: 'Pula' })
    expect(BILLING_CURRENCIES.ZAR).toEqual({ symbol: 'R', name: 'Rand' })
    expect(BILLING_CURRENCIES.KES.symbol).toBe('KSh')
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

  it('charges the local price list in the local currency', () => {
    expect(planCharge('pro', 1, 'ZAR')).toEqual({ amount: '120.00', currency: 'ZAR', description: 'Stagepay Pro Plan — Monthly' })
    expect(planCharge('business', 12, 'ZAR').amount).toBe('5184.00')
    expect(planCharge('pro', 6, 'USD').amount).toBe('40.00') // 7 × 6 × 0.95 = 39.9, rounded like Settings shows it
  })

  it('matches the prices Settings and the landing page show', () => {
    expect(monthlyPrice('free', 'BWP')).toBe(0)
    expect(monthlyPrice('pro', 'BWP')).toBe(100)
    expect(monthlyPrice('business', 'BWP')).toBe(400)
  })
})
