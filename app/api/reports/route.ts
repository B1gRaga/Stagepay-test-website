import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { cents, paidSoFar, balanceDue } from '@/lib/payments'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PAGE = 1000 // Supabase's row cap per request

type Sb = Awaited<ReturnType<typeof createClient>>

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sent', overdue: 'Late', paid: 'Paid', cancelled: 'Cancelled',
}

// Every page of a query, so a busy year isn't cut off at 1000 rows.
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

function issuedInvoices(supabase: Sb, accountId: string, from: string, to: string) {
  return all((a, b) => supabase
    .from('invoices')
    .select('invoice_number, client_name, client_vat, project, issue_date, due_date, status, currency, subtotal, discount_amount, vat_rate, vat_amount, deposit_amount, total, invoice_payments(amount)')
    .eq('user_id', accountId)
    .neq('status', 'draft')
    .gte('issue_date', from)
    .lte('issue_date', to)
    .order('issue_date', { ascending: true })
    .order('invoice_number', { ascending: true })
    .range(a, b))
}

function paymentsIn(supabase: Sb, accountId: string, from: string, to: string) {
  return all((a, b) => supabase
    .from('invoice_payments')
    .select('amount, paid_on, note, invoices(invoice_number, client_name, currency)')
    .eq('user_id', accountId)
    .gte('paid_on', from)
    .lte('paid_on', to)
    .order('paid_on', { ascending: true })
    .range(a, b))
}

// Spreadsheet-safe cell: quoted, and text that starts like a formula is defused.
function cell(v: unknown) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return v.toFixed(2)
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csv(header: string[], rows: unknown[][], filename: string) {
  // BOM so Excel opens the file as UTF-8 (client names with accents, "P" amounts)
  const body = '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

type Sums = { count: number; net: number; vat: number; gross: number; received: number }
type Totals = Sums & {
  currency: string
  owed: number
  months: (Sums & { month: string })[]   // 'YYYY-MM', in order
  clients: (Sums & { client: string })[] // most invoiced first
}

const blank = (): Sums => ({ count: 0, net: 0, vat: 0, gross: 0, received: 0 })
const round = <T extends Sums>(s: T): T => ({ ...s, net: cents(s.net), vat: cents(s.vat), gross: cents(s.gross), received: cents(s.received) })

type Issued = { client_name: string | null; issue_date: string; status: string; currency: string | null; subtotal: unknown; discount_amount: unknown; vat_amount: unknown }
type Received = { amount: unknown; paid_on: string; invoices: { client_name: string | null; currency: string | null } | null }
type Open = { currency: string | null; total: string | number; invoice_payments: { amount: string | number }[] | null }

// Accrual basis by issue date (what was invoiced in the period), with what
// actually came in by paid date alongside; cancelled invoices count for nothing.
function summarise(invs: Issued[], pays: Received[], open: Open[]): Totals[] {
  const by = new Map<string, Totals & { m: Map<string, Sums & { month: string }>; c: Map<string, Sums & { client: string }> }>()
  const cur = (c: string | null) => {
    const k = c || 'P'
    if (!by.has(k)) by.set(k, { currency: k, ...blank(), owed: 0, months: [], clients: [], m: new Map(), c: new Map() })
    return by.get(k)!
  }
  const monthOf = (d: string) => d.slice(0, 7)
  const nameOf = (n: string | null) => n?.trim() || 'No name'
  const bucket = <K extends string, T extends Sums>(map: Map<string, T>, key: string, make: () => T) => {
    if (!map.has(key)) map.set(key, make())
    return map.get(key)!
  }
  for (const i of invs) {
    if (i.status === 'cancelled') continue
    const t   = cur(i.currency)
    const net = Number(i.subtotal) - Number(i.discount_amount || 0)
    const vat = Number(i.vat_amount)
    const m   = bucket(t.m, monthOf(i.issue_date), () => ({ month: monthOf(i.issue_date), ...blank() }))
    const c   = bucket(t.c, nameOf(i.client_name), () => ({ client: nameOf(i.client_name), ...blank() }))
    for (const s of [t, m, c]) { s.count += 1; s.net += net; s.vat += vat; s.gross += net + vat }
  }
  for (const p of pays) {
    const t = cur(p.invoices?.currency ?? null)
    const amount = Number(p.amount)
    t.received += amount
    bucket(t.m, monthOf(p.paid_on), () => ({ month: monthOf(p.paid_on), ...blank() })).received += amount
    bucket(t.c, nameOf(p.invoices?.client_name ?? null), () => ({ client: nameOf(p.invoices?.client_name ?? null), ...blank() })).received += amount
  }
  for (const i of open) cur(i.currency).owed += balanceDue(i.total, i.invoice_payments)

  return [...by.values()]
    .map(({ m, c, ...t }) => ({
      ...round(t), owed: cents(t.owed),
      months: [...m.values()].sort((a, b) => a.month.localeCompare(b.month)).map(round),
      clients: [...c.values()].sort((a, b) => b.gross - a.gross || a.client.localeCompare(b.client)).map(round),
    }))
    .sort((a, b) => b.gross + b.received - (a.gross + a.received))
}

// 'YYYY-MM' → 'Oct 2026', for the summary spreadsheet.
function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
//   JSON: per currency, what was invoiced (net, VAT, gross), what came in, and
//   what's owed today, each also broken down by month and by client.
// GET /api/reports?...&format=csv&type=invoices|payments|summary
//   The invoices issued, the payments received, or the month-and-client
//   summary for the period, as a CSV for an accountant or a VAT return.
export async function GET(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp   = req.nextUrl.searchParams
  const from = sp.get('from') ?? ''
  const to   = sp.get('to') ?? ''
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return NextResponse.json({ error: 'Choose a start and end date' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    if (sp.get('format') === 'csv' && sp.get('type') !== 'summary') {
      if (sp.get('type') === 'payments') {
        const pays = await paymentsIn(supabase, account.accountId, from, to)
        return csv(
          ['Date paid', 'Invoice', 'Client', 'Currency', 'Amount', 'Note'],
          pays.map(p => [p.paid_on, p.invoices?.invoice_number, p.invoices?.client_name, p.invoices?.currency || 'P', Number(p.amount), p.note]),
          `stagepay-payments-${from}-to-${to}.csv`,
        )
      }
      const invs = await issuedInvoices(supabase, account.accountId, from, to)
      return csv(
        ['Invoice', 'Client', 'Client VAT no.', 'Project', 'Issue date', 'Due date', 'Status', 'Currency',
         'Subtotal', 'Discount', 'Net (excl. VAT)', 'VAT %', 'VAT', 'Gross (incl. VAT)', 'Deposit', 'Amount due', 'Paid', 'Balance'],
        invs.map(i => {
          const net  = cents(Number(i.subtotal) - Number(i.discount_amount || 0))
          const paid = paidSoFar(i.invoice_payments)
          const part = paid > 0 && i.status !== 'paid' && i.status !== 'cancelled'
          return [
            i.invoice_number, i.client_name, i.client_vat, i.project, i.issue_date, i.due_date,
            part ? 'Part paid' : STATUS_LABEL[i.status] ?? i.status, i.currency || 'P',
            Number(i.subtotal), Number(i.discount_amount || 0), net, Number(i.vat_rate), Number(i.vat_amount),
            cents(net + Number(i.vat_amount)), Number(i.deposit_amount || 0), Number(i.total), paid,
            i.status === 'cancelled' ? 0 : balanceDue(i.total, i.invoice_payments),
          ]
        }),
        `stagepay-invoices-${from}-to-${to}.csv`,
      )
    }

    const [invs, pays, open] = await Promise.all([
      issuedInvoices(supabase, account.accountId, from, to),
      paymentsIn(supabase, account.accountId, from, to),
      all((a, b) => supabase
        .from('invoices')
        .select('currency, total, invoice_payments(amount)')
        .eq('user_id', account.accountId)
        .in('status', ['sent', 'overdue'])
        .range(a, b)),
    ])
    const totals = summarise(invs, pays, open)

    if (sp.get('format') === 'csv' && sp.get('type') === 'summary') {
      const line = (section: string, label: string, currency: string, s: Sums) =>
        [section, label, currency, s.count, s.net, s.vat, s.gross, s.received]
      return csv(
        ['Section', 'Month or client', 'Currency', 'Invoices', 'Net (excl. VAT)', 'VAT', 'Gross (incl. VAT)', 'Received'],
        totals.flatMap(t => [
          ...t.months.map(m => line('Month', monthLabel(m.month), t.currency, m)),
          ...t.clients.map(c => line('Client', c.client, t.currency, c)),
          line('Total', `${from} to ${to}`, t.currency, t),
        ]),
        `stagepay-summary-${from}-to-${to}.csv`,
      )
    }

    return NextResponse.json({ from, to, totals })
  } catch {
    return NextResponse.json({ error: 'Couldn’t build the report' }, { status: 500 })
  }
}
