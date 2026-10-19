// Plain data shared between the dashboard Server Component and the PeriodSelect
// Client Component. Deliberately NOT in a 'use client' file: importing a value
// export from a 'use client' module into a Server Component causes Next.js's
// RSC bundler to replace that module's exports with client-reference stubs,
// so a Server Component sees a non-array placeholder instead of the real data
// (surfaces as "PERIODS.some is not a function" at render time).
export const PERIODS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 3 months' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
] as const

export type PeriodId = typeof PERIODS[number]['id']
