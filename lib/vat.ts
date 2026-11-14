// VAT may only be charged by a business registered for it. StagePay takes a
// VAT number on the profile as that proof: without one, invoices carry no VAT.
// Enforced here (API), in the forms, and in the database (migration 051).

export const hasVatNumber = (v?: string | null): boolean => !!v && v.trim().length > 0

export const VAT_NEEDS_NUMBER =
  'Only VAT-registered businesses can charge VAT. Add your VAT number in Settings → Firm details first.'

// Fields that make up what an invoice says. Once it has gone out (any status
// but draft) these are fixed: a mistake is fixed by cancelling the invoice and
// issuing a corrected copy, so the record of what was billed stays honest.
export const LOCKED_INVOICE_FIELDS = [
  'client_name', 'client_address', 'client_vat', 'project', 'billed_for', 'notes',
  'issue_date', 'currency', 'vat_rate', 'discount_amount', 'deposit_amount',
] as const

export const INVOICE_LOCKED_MSG =
  'This invoice has already gone out, so it can’t be changed. Cancel it and make a corrected copy instead.'

const NUMERIC = new Set(['vat_rate', 'discount_amount', 'deposit_amount'])

/** Normalise a field value so "", null and undefined, or 14 and "14.00", compare equal. */
export function sameField(key: string, a: unknown, b: unknown): boolean {
  if (NUMERIC.has(key)) return Number(a ?? 0) === Number(b ?? 0)
  const s = (v: unknown) => (v == null ? '' : String(v).trim())
  return s(a) === s(b)
}

type Item = { description?: unknown; quantity?: unknown; unit_price?: unknown; sort_order?: unknown }

/** True when two line-item lists say the same thing, in the same order. */
export function sameItems(saved: Item[], incoming: Item[]): boolean {
  const norm = (list: Item[]) => list.map(i => `${String(i.description ?? '').trim()}|${Number(i.quantity)}|${Number(i.unit_price)}`)
  const a = norm([...saved].sort((x, y) => Number(x.sort_order ?? 0) - Number(y.sort_order ?? 0)))
  const b = norm(incoming)
  return a.length === b.length && a.every((v, i) => v === b[i])
}
