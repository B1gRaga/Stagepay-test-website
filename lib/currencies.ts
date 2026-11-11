// Currencies an invoice can be made out in. Profiles and invoices store the
// symbol (rows from before codes existed hold it too), so the symbol is the key.
export const CURRENCIES = [
  { code: 'BWP', symbol: 'P',   label: 'BWP — Pula (P)' },
  { code: 'ZAR', symbol: 'R',   label: 'ZAR — Rand (R)' },
  { code: 'USD', symbol: '$',   label: 'USD — Dollar ($)' },
  { code: 'EUR', symbol: '€',   label: 'EUR — Euro (€)' },
  { code: 'GBP', symbol: '£',   label: 'GBP — Pound (£)' },
  { code: 'KES', symbol: 'KSh', label: 'KES — Kenyan Shilling (KSh)' },
  { code: 'NGN', symbol: '₦',   label: 'NGN — Naira (₦)' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS — Cedi (GH₵)' },
  { code: 'AUD', symbol: 'A$',  label: 'AUD — Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', label: 'AED — Dirham' },
] as const

// 'P' → 'BWP'. A code comes back as a code; anything unknown comes back unchanged.
export function currencyCode(v: string | null | undefined): string {
  const s = (v ?? '').trim()
  const hit = CURRENCIES.find(c => c.symbol === s || c.code === s.toUpperCase())
  return hit ? hit.code : s
}
