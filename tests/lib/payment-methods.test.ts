import { describe, it, expect } from 'vitest'
import { cleanMethod, paymentBlocks } from '@/lib/payment-methods'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

describe('cleanMethod', () => {
  it('keeps bank fields and trims them', () => {
    expect(cleanMethod({ kind: 'bank', bank: ' FNB ', number: '62123456789', branch_code: '282667', extra: 'x' }))
      .toEqual({ kind: 'bank', bank: 'FNB', number: '62123456789', branch_code: '282667' })
  })

  it('drops bank-only fields from wallets', () => {
    expect(cleanMethod({ kind: 'orange', number: '71234567', account_name: 'Yugen Studios', bank: 'FNB', swift: 'X' }))
      .toEqual({ kind: 'orange', number: '71234567', account_name: 'Yugen Studios' })
  })

  it('rejects unknown kinds, missing numbers and markup', () => {
    expect(cleanMethod({ kind: 'paypal', number: '1' })).toBeNull()
    expect(cleanMethod({ kind: 'smega', number: '  ' })).toBeNull()
    expect(cleanMethod({ kind: 'myzaka', number: '<b>75406331</b>' })).toEqual({ kind: 'myzaka', number: '75406331' })
    expect(cleanMethod(null)).toBeNull()
  })
})

describe('paymentBlocks', () => {
  it('prints each usable method in order', () => {
    expect(paymentBlocks([
      { kind: 'bank', bank: 'FNB', account_name: 'Yugen Studios', number: '62123456789' },
      { kind: 'smega', number: '' },
      { kind: 'myzaka', number: '75406331', account_name: 'N Kwebindeke' },
    ])).toEqual([
      { title: 'FNB', rows: [['Account name', 'Yugen Studios'], ['Account number', '62123456789']] },
      { title: 'MyZaka', rows: [['Number', '75406331'], ['Name', 'N Kwebindeke']] },
    ])
  })

  it('handles nothing saved', () => {
    expect(paymentBlocks(undefined)).toEqual([])
    expect(paymentBlocks('nope')).toEqual([])
  })
})

describe('invoice PDF with payment methods', () => {
  const invoice = {
    invoice_number: 'INV-202610-001', client_name: 'Mariam', issue_date: '2026-10-20', due_date: '2026-11-19',
    subtotal: 100, vat_rate: 14, vat_amount: 14, total: 114, currency: 'P', status: 'sent', notes: null,
  }
  const items = [{ description: 'Maths tuition', quantity: 1, unit_price: 100, sort_order: 0 }]
  const profile = {
    firm_name: 'Yugen Studios',
    payment_methods: [
      { kind: 'bank', bank: 'FNB', number: '62123456789', branch_code: '282667' },
      { kind: 'orange', number: '71234567', account_name: 'Yugen Studios' },
    ],
  }

  it('renders unpaid and paid invoices', async () => {
    const unpaid = await generateInvoicePDF(invoice, items, profile)
    const paid = await generateInvoicePDF({ ...invoice, status: 'paid' }, items, profile, { showPaidStamp: true })
    expect(unpaid.subarray(0, 4).toString()).toBe('%PDF')
    expect(paid.subarray(0, 4).toString()).toBe('%PDF')
  }, 30000)
})
