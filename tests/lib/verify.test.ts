import { describe, it, expect, vi } from 'vitest'
import { qrPath, verifyUrl } from '@/lib/verify'

describe('verify link and QR', () => {
  it('points the code at the invoice’s own page, flagged as a verification', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://getstagepay.co/')
    expect(verifyUrl('ed102f379cf41e5425a52fc9e9b3a561')).toBe('https://getstagepay.co/invoice/ed102f379cf41e5425a52fc9e9b3a561?v=1')
  })

  it('draws the QR as one path of unit squares inside a square viewBox', () => {
    const { size, path } = qrPath('https://getstagepay.co/invoice/ed102f379cf41e5425a52fc9e9b3a561?v=1')
    expect(size).toBeGreaterThanOrEqual(21)
    expect(size % 4).toBe(1)                      // QR versions are 21, 25, 29…
    expect(path.startsWith('M0 0h1v1h-1z')).toBe(true) // the top-left finder pattern is dark
    const squares = path.match(/M\d+ \d+h1v1h-1z/g) ?? []
    expect(squares.length).toBeGreaterThan(size * size * 0.3)
    expect(squares.length).toBeLessThan(size * size * 0.7)
  })
})

describe('generateInvoicePDF', () => {
  const invoice = {
    id: 'inv-1', invoice_number: 'INV-202611-036', client_name: 'Live Check Parent', status: 'paid', total: 342, subtotal: 300,
    vat_rate: 14, vat_amount: 42, discount_amount: 0, deposit_amount: 0, currency: 'P', issue_date: '2026-11-13', due_date: '2026-12-13',
    public_token: 'ed102f379cf41e5425a52fc9e9b3a561', invoice_payments: [{ amount: 342, paid_on: '2026-11-13', note: 'Cash' }],
  }
  const items = [{ description: 'Mathematics', quantity: 1, unit_price: 300, sort_order: 0 }]
  const profile = { firm_name: 'Thuto Tuition Centre', signature_name: 'Neo Kgosi · Director' }

  it('renders a PDF with the verification code on every layout, and leaves it off samples', async () => {
    const { generateInvoicePDF } = await import('@/lib/invoice-pdf')
    for (const theme of ['dark-modern', 'clean-light', 'minimal', 'charcoal', 'bold-amber']) {
      const withCode = await generateInvoicePDF(invoice, items, profile, { theme })
      expect(withCode.subarray(0, 5).toString()).toBe('%PDF-')
      const without = await generateInvoicePDF(invoice, items, profile, { theme, verify: false })
      expect(withCode.length).toBeGreaterThan(without.length)
    }
    const sample = await generateInvoicePDF({ ...invoice, public_token: null }, items, profile)
    expect(sample.subarray(0, 5).toString()).toBe('%PDF-')
  }, 60_000)
})
