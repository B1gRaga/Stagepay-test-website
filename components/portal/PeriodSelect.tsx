'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export const PERIODS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 3 months' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
] as const

export type PeriodId = typeof PERIODS[number]['id']

export function PeriodSelect({ value }: { value: PeriodId }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(period: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (period === '30d') params.delete('period')
    else params.set('period', period)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      className="topbar-btn btn-outline"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ paddingRight: 10, cursor: 'pointer' }}
      aria-label="History period"
    >
      {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
  )
}
