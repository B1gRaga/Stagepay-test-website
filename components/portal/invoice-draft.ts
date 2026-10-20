// Plain types and helpers shared by the new-invoice Server page and NewInvoiceClient.
// Deliberately not a 'use client' module (see periods.ts for why).

export type LineItem = { desc: string; qty: number; rate: number }

export type LastInvoice = {
  invoice_number: string
  project: string | null
  issue_date: string | null
  currency: string | null
  total: number
  items: LineItem[]
}

export type KnownItem = { desc: string; rate: number }
