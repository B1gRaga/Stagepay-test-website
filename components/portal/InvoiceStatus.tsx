// Invoice status as WhatsApp-style ticks plus words.
// Ticks only claim what StagePay knows: sent (✓), a reminder went out (✓✓), paid (gold).
// Manual sends go through wa.me, so "delivered" and "read" are never shown.

export type StatusInput = {
  status: string
  due_date?: string | null
  reminders_sent?: number
}

type Mark = 'draft' | 'sent' | 'reminded' | 'late' | 'paid' | 'cancelled'

const DAY = 86_400_000

function daysFromToday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const due = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((due - today) / DAY)
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function describeStatus({ status, due_date, reminders_sent = 0 }: StatusInput): { mark: Mark; label: string } {
  const reminded = reminders_sent === 1 ? 'Reminded once' : reminders_sent === 2 ? 'Reminded twice' : `Reminded ${reminders_sent} times`
  switch (status) {
    case 'paid':
      return { mark: 'paid', label: 'Paid' }
    case 'cancelled':
      return { mark: 'cancelled', label: 'Cancelled' }
    case 'draft':
      return { mark: 'draft', label: 'Draft, not sent' }
    case 'overdue': {
      const late = due_date ? -daysFromToday(due_date) : 0
      return { mark: 'late', label: late > 0 ? `${plural(late, 'day', 'days')} late` : 'Overdue' }
    }
    case 'sent':
    case 'pending': {
      if (reminders_sent > 0) return { mark: 'reminded', label: reminded }
      if (!due_date) return { mark: 'sent', label: 'Sent' }
      const d = daysFromToday(due_date)
      const label = d > 1 ? `Due in ${d} days` : d === 1 ? 'Due tomorrow' : d === 0 ? 'Due today' : `Due ${plural(-d, 'day', 'days')} ago`
      return { mark: 'sent', label }
    }
    default:
      return { mark: 'sent', label: status }
  }
}

const TICK = 'M3.2 8.6l2.7 2.7 5.4-6.1'

export function StatusMark({ mark, size = 18 }: { mark: Mark; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 18 18', 'aria-hidden': true as const, className: `st-mark st-${mark}` }
  switch (mark) {
    case 'draft':
      return <svg {...common}><circle cx="9" cy="9" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    case 'sent':
      return <svg {...common}><path d={TICK} transform="translate(2 0.5)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    case 'reminded':
    case 'late':
      return (
        <svg {...common}>
          <path d={TICK} transform="translate(-0.5 0.5)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d={TICK} transform="translate(4.3 0.5)" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'paid':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="8" fill="currentColor" />
          <path d={TICK} transform="translate(1.6 0.4)" fill="none" stroke="var(--st-on-paid)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'cancelled':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.6 13.4l8.8-8.8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

export function InvoiceStatus({ size = 18, className = '', ...input }: StatusInput & { size?: number; className?: string }) {
  const { mark, label } = describeStatus(input)
  return (
    <span className={`st st-${mark} ${className}`}>
      <StatusMark mark={mark} size={size} />
      <span className="st-label">{label}</span>
    </span>
  )
}

// Shared by every screen that shows a status. Colour sits on the mark and on lateness only.
export const STATUS_CSS = `
  :root{--st-paid:#C98C00;--st-on-paid:#FFFFFF;--st-late:#DC4B3E;}
  html:not([data-theme="light"]){--st-paid:#F2A900;--st-on-paid:#1F2A44;--st-late:#F07167;}
  .st{display:inline-flex;align-items:center;gap:7px;font-size:13px;line-height:1.2;color:var(--t2);white-space:nowrap;}
  .st-mark{flex:none;display:block;}
  .st-mark.st-draft,.st-mark.st-cancelled{color:var(--t3);}
  .st-mark.st-sent,.st-mark.st-reminded{color:var(--t1);}
  .st-late,.st-mark.st-late{color:var(--st-late);}
  .st-late .st-label{font-weight:600;}
  .st-mark.st-paid{color:var(--st-paid);}
  .st-paid .st-label{color:var(--t1);font-weight:600;}
  .st-cancelled .st-label{text-decoration:line-through;}
`
