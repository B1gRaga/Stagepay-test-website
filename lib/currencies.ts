// Currencies an invoice can be made out in. Profiles and invoices store the
// symbol (rows from before codes existed hold it too), so the symbol is the key.
// `name` reads naturally after "You pay in …".
export const CURRENCIES = [
  { code: 'BWP', symbol: 'P',   name: 'Pula',               label: 'BWP — Pula (P)' },
  { code: 'ZAR', symbol: 'R',   name: 'Rand',               label: 'ZAR — Rand (R)' },
  { code: 'USD', symbol: '$',   name: 'US Dollars',         label: 'USD — Dollar ($)' },
  { code: 'EUR', symbol: '€',   name: 'Euros',              label: 'EUR — Euro (€)' },
  { code: 'GBP', symbol: '£',   name: 'Pounds',             label: 'GBP — Pound (£)' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shillings',   label: 'KES — Kenyan Shilling (KSh)' },
  { code: 'NGN', symbol: '₦',   name: 'Naira',              label: 'NGN — Naira (₦)' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedis',              label: 'GHS — Cedi (GH₵)' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollars', label: 'AUD — Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', name: 'Dirhams',            label: 'AED — Dirham' },
] as const

// 'P' → 'BWP'. A code comes back as a code; anything unknown comes back unchanged.
export function currencyCode(v: string | null | undefined): string {
  const s = (v ?? '').trim()
  const hit = CURRENCIES.find(c => c.symbol === s || c.code === s.toUpperCase())
  return hit ? hit.code : s
}
