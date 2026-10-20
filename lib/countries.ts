// Countries a business can be based in. Profiles store the code; older
// profiles hold the full name, so both are accepted when reading.
export const COUNTRIES = [
  { code: 'BW', name: 'Botswana' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NA', name: 'Namibia' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MW', name: 'Malawi' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
] as const

// "BW", "bw" or "Botswana" → "BW"; unknown values are returned unchanged.
export function countryCode(v: string | null | undefined) {
  const s = (v ?? '').trim()
  const hit = COUNTRIES.find(c => c.code === s.toUpperCase() || c.name.toLowerCase() === s.toLowerCase())
  return hit ? hit.code : s
}

// "BW" or "Botswana" → "Botswana", for printing on invoices.
export function countryName(v: string | null | undefined) {
  const s = (v ?? '').trim()
  return COUNTRIES.find(c => c.code === s.toUpperCase())?.name ?? s
}
