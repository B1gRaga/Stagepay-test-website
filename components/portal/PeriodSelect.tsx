'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PERIODS, type PeriodId } from './periods'

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
      className="period-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Period"
    >
      {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
  )
}
