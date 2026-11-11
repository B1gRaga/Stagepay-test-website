import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The period report and the CSVs an accountant gets.
let rows: Record<string, Record<string, any>[]>

vi.mock('@/lib/account', () => ({ getAccount: async () => ({ userId: 'user-1', accountId: 'acct-1', role: 'owner' }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      let open = false
      const chain: Record<string, any> = {}
      for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'order']) chain[m] = () => chain
      chain.in = () => { open = true; return chain }
      chain.range = async () => ({ data: rows[open ? 'open' : table], error: null })
      return chain
    },
  }),
}))

const get = (qs: string) => new NextRequest(`http://localhost/api/reports?${qs}`)

describe('GET /api/reports', () => {
  beforeEach(() => {
    rows = {
      invoices: [
        { invoice_number: 'INV-001', client_name: '=HYPERLINK("x")', client_vat: null, project: 'Roof, west side', issue_date: '2026-10-02', due_date: '2026-10-16', status: 'sent', currency: 'P', subtotal: 1000, discount_amount: 100, vat_rate: 14, vat_amount: 126, deposit_amount: 0, total: 1026, invoice_payments: [{ amount: 500 }] },
        { invoice_number: 'INV-002', client_name: 'Kgosi', client_vat: null, project: null, issue_date: '2026-10-09', due_date: null, status: 'cancelled', currency: 'P', subtotal: 400, discount_amount: 0, vat_rate: 14, vat_amount: 56, deposit_amount: 0, total: 456, invoice_payments: [] },
      ],
      invoice_payments: [
        { amount: 500, paid_on: '2026-10-20', note: 'MyZaka', invoices: { invoice_number: 'INV-001', client_name: 'Neo', currency: 'P' } },
      ],
      open: [{ currency: 'P', total: 1026, invoice_payments: [{ amount: 500 }] }],
    }
  })

  it('needs a valid period', async () => {
    const { GET } = await import('@/app/api/reports/route')
    expect((await GET(get('from=2026-10-31&to=2026-10-01'))).status).toBe(400)
    expect((await GET(get('from=oct&to=2026-10-31'))).status).toBe(400)
  })

  it('sums invoiced, VAT and received per currency, leaving out cancelled invoices', async () => {
    const { GET } = await import('@/app/api/reports/route')
    const body = await (await GET(get('from=2026-10-01&to=2026-10-31'))).json()
    expect(body.totals).toEqual([expect.objectContaining({ currency: 'P', count: 1, net: 900, vat: 126, gross: 1026, received: 500, owed: 526 })])
  })

  it('breaks the period down by month and by client, received on the month it was paid', async () => {
    rows.invoices.push({ invoice_number: 'INV-003', client_name: 'Kgosi', client_vat: null, project: null, issue_date: '2026-11-03', due_date: null, status: 'sent', currency: 'P', subtotal: 200, discount_amount: 0, vat_rate: 14, vat_amount: 28, deposit_amount: 0, total: 228, invoice_payments: [] })
    rows.invoice_payments.push({ amount: 100, paid_on: '2026-11-05', note: null, invoices: { invoice_number: 'INV-003', client_name: 'Kgosi', currency: 'P' } })
    const { GET } = await import('@/app/api/reports/route')
    const [p] = (await (await GET(get('from=2026-10-01&to=2026-11-30'))).json()).totals
    expect(p.months).toEqual([
      { month: '2026-10', count: 1, net: 900, vat: 126, gross: 1026, received: 500 },
      { month: '2026-11', count: 1, net: 200, vat: 28, gross: 228, received: 100 },
    ])
    // Most invoiced first; the cancelled invoice counts for nothing, and a payment's
    // client comes from its invoice.
    expect(p.clients).toEqual([
      { client: '=HYPERLINK("x")', count: 1, net: 900, vat: 126, gross: 1026, received: 0 },
      { client: 'Kgosi', count: 1, net: 200, vat: 28, gross: 228, received: 100 },
      { client: 'Neo', count: 0, net: 0, vat: 0, gross: 0, received: 500 },
    ])
  })

  it('exports the month-and-client summary as one CSV', async () => {
    const { GET } = await import('@/app/api/reports/route')
    const res = await GET(get('from=2026-10-01&to=2026-10-31&format=csv&type=summary'))
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="stagepay-summary-2026-10-01-to-2026-10-31.csv"')
    const lines = (await res.text()).replace(/^﻿/, '').trim().split('\r\n')
    expect(lines[0]).toBe('Section,Month or client,Currency,Invoices,Net (excl. VAT),VAT,Gross (incl. VAT),Received')
    expect(lines[1]).toBe('Month,Oct 2026,P,1.00,900.00,126.00,1026.00,500.00')
    expect(lines[2]).toBe(`Client,"'=HYPERLINK(""x"")",P,1.00,900.00,126.00,1026.00,0.00`)
    expect(lines[lines.length - 1]).toBe('Total,2026-10-01 to 2026-10-31,P,1.00,900.00,126.00,1026.00,500.00')
  })

  it('exports invoices as a spreadsheet-safe CSV', async () => {
    const { GET } = await import('@/app/api/reports/route')
    const res = await GET(get('from=2026-10-01&to=2026-10-31&format=csv&type=invoices'))
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="stagepay-invoices-2026-10-01-to-2026-10-31.csv"')
    const lines = (await res.text()).replace(/^﻿/, '').trim().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe(`INV-001,"'=HYPERLINK(""x"")",,"Roof, west side",2026-10-02,2026-10-16,Part paid,P,1000.00,100.00,900.00,14.00,126.00,1026.00,0.00,1026.00,500.00,526.00`)
    expect(lines[2]).toContain(',Cancelled,')
    expect(lines[2].endsWith(',0.00,0.00')).toBe(true)
  })

  it('exports payments received', async () => {
    const { GET } = await import('@/app/api/reports/route')
    const text = await (await GET(get('from=2026-10-01&to=2026-10-31&format=csv&type=payments'))).text()
    expect(text.trim().split('\r\n')[1]).toBe('2026-10-20,INV-001,Neo,P,500.00,MyZaka')
  })
})
