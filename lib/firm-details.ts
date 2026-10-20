import { countryName } from './countries'

export type FirmFields = {
  firm_name?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  vat_number?: string | null
}

// The "from" block every invoice prints, in one place.
export function firmLines(p: FirmFields | null | undefined) {
  const clean = (v: string | null | undefined) => (v ?? '').trim()
  // People often type the whole address into one field; don't repeat the town or country.
  const parts: string[] = []
  for (const part of [clean(p?.address), clean(p?.city), countryName(p?.country)]) {
    if (part && !parts.join(', ').toLowerCase().split(/\s*,\s*/).includes(part.toLowerCase())) parts.push(part)
  }
  return {
    name:    clean(p?.firm_name) || clean(p?.name),
    address: parts.join(', '),
    contact: [clean(p?.email), clean(p?.phone)].filter(Boolean).join('  ·  '),
    vat:     clean(p?.vat_number) ? `VAT No: ${clean(p?.vat_number)}` : '',
  }
}
