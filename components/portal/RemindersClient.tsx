'use client'
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { openWhatsApp, publicInvoiceUrl } from '@/lib/wa-link'
import Link from 'next/link'
import { STATUS_CSS } from './InvoiceStatus'
import { DEFAULT_REMINDER_DAYS } from '@/lib/reminder-days'

export type Invoice = {
  id: string
  invoice_number: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  project: string | null
  due_date: string | null
  total: number
  currency: string
  status: string
  public_token?: string | null
}

export type Reminder = {
  id: string
  invoice_id: string
  status: string
  send_at: string
  channel: string
  sent_at: string | null
  days_after_due?: number | null
  error_message?: string | null
}

const ACTIVE_STATUSES = ['sent', 'overdue']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Days after the due date that automatic reminders can go out on.
const STAGES = [
  { day: 3,  desc: 'Gentle first nudge' },
  { day: 7,  desc: 'Polite follow-up'   },
  { day: 14, desc: 'Firm final notice'  },
  { day: 30, desc: 'Final demand'       },
]

// The track runs from a week before the due date to 30 days after it.
const TRACK_MIN = -7, TRACK_MAX = 30
const DAY = 86400000

function localDay(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
function todayStart() {
  const t = new Date(); t.setHours(0, 0, 0, 0); return t
}
function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0
  return Math.round((todayStart().getTime() - localDay(dueDateStr).getTime()) / DAY)
}
function shortDate(d: Date, weekday = false) {
  return `${weekday ? WEEKDAYS[d.getDay()] + ' ' : ''}${d.getDate()} ${MONTHS[d.getMonth()]}`
}
// "Tuesday 27 October", for messages the client reads.
function longDate(s: string) {
  return localDay(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
function money(n: number, sym: string) {
  return `${sym}${Math.round(Number(n)).toLocaleString('en')}`
}
function fmtAmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`
}
function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
function reminderDay(r: Reminder, due: string | null) {
  if (r.days_after_due != null) return r.days_after_due
  if (!due) return 0
  return Math.round((new Date(r.send_at).getTime() - localDay(due).getTime()) / DAY)
}

function genEmail(inv: Invoice, firmName: string): string {
  const days = daysOverdue(inv.due_date)
  const amount = fmtAmt(inv.total, inv.currency || 'P')
  const dueLine = !inv.due_date ? '' :
    days > 0  ? `The invoice is currently ${days} day${days === 1 ? '' : 's'} overdue.` :
    days === 0 ? 'The invoice is due today.' :
                 `The invoice is due on ${longDate(inv.due_date)}.`

  return `Dear ${inv.client_name},

I hope this message finds you well. I wanted to follow up on invoice ${inv.invoice_number} for ${amount}${inv.project ? ` (${inv.project})` : ''}. ${dueLine}

Could you please let me know if you require any additional information to facilitate payment? We are happy to assist with any questions.

Kind regards,
${firmName}`
}

function genWhatsApp(inv: Invoice, firmName: string): string {
  const days = daysOverdue(inv.due_date)
  const amount = fmtAmt(inv.total, inv.currency || 'P')
  const dueLine = !inv.due_date ? '' :
    days > 0  ? `It is currently *${days} day${days === 1 ? '' : 's'} overdue*.` :
    days === 0 ? 'It is *due today*.' :
                 `It is due on *${longDate(inv.due_date)}*.`

  return `Hi ${inv.client_name} 👋

Just a friendly follow-up on invoice *${inv.invoice_number}* for *${amount}*${inv.project ? ` (${inv.project})` : ''}. ${dueLine}

${inv.public_token ? `You can view the invoice here: ${publicInvoiceUrl(inv.public_token)}\n\n` : ''}Please let me know if you have any questions or need anything from our side.

Regards,
${firmName}`
}

const WA_PATH = 'M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z'

const CSS = `
${STATUS_CSS}
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .btn-new{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:8px;background:var(--g);color:#1F2A44;font-size:14px;font-weight:700;text-decoration:none;}
  .btn-new:hover{background:#FFB81C;}
  .content{padding:24px 28px 48px;max-width:1180px;}
  .finding{font-size:15px;color:var(--t1);line-height:1.5;margin-bottom:6px;}
  .finding b{font-variant-numeric:tabular-nums;}
  .finding .late{color:var(--st-late);}
  .next{font-size:14px;color:var(--t2);margin-bottom:20px;}
  .next b{color:var(--t1);font-weight:600;}
  .note{border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px;background:color-mix(in srgb,var(--st-late) 10%,transparent);color:var(--st-late);}

  /* The schedule, as one sentence of switches */
  .rules{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;padding:14px 18px;margin-bottom:22px;background:var(--bg2);border:1px solid var(--line);border-radius:12px;font-size:14px;color:var(--t2);}
  .rules .lead{color:var(--t1);font-weight:600;margin-right:2px;}
  .chips{display:inline-flex;gap:4px;}
  .chip{height:30px;min-width:38px;padding:0 10px;border-radius:7px;border:1px solid var(--line2);background:transparent;color:var(--t2);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
  .chip:hover{border-color:var(--t3);color:var(--t1);}
  .chip[aria-pressed="true"]{background:var(--t1);border-color:var(--t1);color:var(--bg2);}
  .chip:disabled{opacity:.45;cursor:not-allowed;}
  .chip .wa-i{color:#1DA851;}
  html:not([data-theme="light"]) .chip .wa-i{color:#3DDC84;}
  .chip[aria-pressed="true"] .wa-i{color:inherit;}
  .rules .aside{flex-basis:100%;font-size:12px;color:var(--t3);}

  .group{margin-bottom:22px;}
  .group h2{display:flex;align-items:baseline;gap:8px;font-size:13px;font-weight:600;color:var(--t2);margin:0 0 8px 2px;}
  .group h2 .n{font-weight:500;color:var(--t3);font-variant-numeric:tabular-nums;}
  .group.late h2{color:var(--st-late);}
  .sheet{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .grid{display:grid;grid-template-columns:minmax(0,1.3fr) 110px 150px minmax(220px,1fr) 168px;column-gap:20px;align-items:center;padding:0 20px;}
  .row{min-height:84px;border-bottom:1px solid var(--line);transition:background-color var(--dur-1) var(--ease);animation:rm-in var(--dur-3) var(--ease) both;animation-delay:calc(var(--i,0) * 35ms);}
  .row:last-child{border-bottom:0;}
  .row:hover{background:color-mix(in srgb,var(--t1) 3%,transparent);}
  .who{min-width:0;padding:14px 0;}
  .client{display:block;font-size:14px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ref{display:block;font-size:13px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .amt{font-size:15px;font-weight:700;color:var(--t1);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
  .late .amt,.amt.late{color:var(--st-late);}
  .when{font-size:14px;font-weight:600;color:var(--t1);white-space:nowrap;}
  .when.late{color:var(--st-late);}
  .when small{display:block;font-size:12px;font-weight:500;color:var(--t2);margin-top:2px;}

  .track-wrap{min-width:0;padding:12px 0;}
  .track{position:relative;height:30px;margin:0 10px;}
  .track .base{position:absolute;left:0;right:0;top:11px;height:2px;border-radius:1px;background:var(--line2);}
  .track .elapsed{position:absolute;left:0;top:11px;height:2px;border-radius:1px;background:var(--t3);transform-origin:left;animation:rm-grow 900ms var(--ease) both;animation-delay:calc(120ms + var(--i,0) * 35ms);}
  .late .track .elapsed{background:color-mix(in srgb,var(--st-late) 55%,transparent);}
  .track .due{position:absolute;top:5px;width:2px;height:14px;border-radius:1px;background:var(--t2);transform:translateX(-50%);}
  .mk{position:absolute;top:7px;width:10px;height:10px;border-radius:50%;transform:translateX(-50%);box-sizing:border-box;}
  .mk.plan{border:1.5px dashed var(--t3);background:var(--bg2);}
  .mk.sched{border:2px solid var(--t1);background:var(--bg2);}
  .mk.sent{background:var(--t1);}
  .mk.fail{background:var(--st-late);}
  .mk.off{top:10px;width:4px;height:4px;background:var(--line2);}
  .track .lbl.off{opacity:.55;}
  .chip.fixed{cursor:default;background:var(--t1);border-color:var(--t1);color:var(--bg2);}
  .cap .warn{color:var(--st-late);}
  .track .today{position:absolute;top:0;width:2px;height:24px;border-radius:1px;background:var(--g);transform:translateX(-50%);animation:rm-fade var(--dur-3) var(--ease) both;animation-delay:calc(600ms + var(--i,0) * 35ms);}
  .track .lbl{position:absolute;top:19px;font-size:11px;line-height:12px;color:var(--t2);transform:translateX(-50%);white-space:nowrap;font-variant-numeric:tabular-nums;}
  .cap{display:block;font-size:12px;color:var(--t2);margin:4px 6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cap.warn{color:var(--st-late);}

  .acts{display:flex;align-items:center;justify-content:flex-end;gap:10px;}
  .sw{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 4px;border:0;background:transparent;color:var(--t2);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;}
  .sw .knob{position:relative;width:34px;height:20px;border-radius:10px;background:var(--line2);transition:background-color var(--dur-2) var(--ease);}
  .sw .knob::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:var(--bg2);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform var(--dur-2) var(--ease);} /* taste-skill-ignore: switch knob */
  .sw[aria-checked="true"]{color:var(--t1);}
  .sw[aria-checked="true"] .knob{background:var(--g);}
  .sw[aria-checked="true"] .knob::after{transform:translateX(14px);}
  .sw:disabled{opacity:.5;cursor:progress;}
  .act{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border-radius:8px;border:1px solid var(--line2);background:var(--bg2);color:var(--t1);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;white-space:nowrap;}
  .act:hover{border-color:var(--t3);}
  .late .act.chase{background:var(--t1);border-color:var(--t1);color:var(--bg2);}
  .sw:focus-visible,.act:focus-visible,.chip:focus-visible,.btn-new:focus-visible,.tab:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:8px;}

  .empty{padding:56px 24px;text-align:center;background:var(--bg2);border:1px solid var(--line);border-radius:12px;}
  .empty h2{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px;}
  .empty p{font-size:14px;color:var(--t2);max-width:360px;margin:0 auto 18px;}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}

  @keyframes rm-in{from{opacity:0;transform:translateY(6px)}}
  @keyframes rm-grow{from{transform:scaleX(0)}}
  @keyframes rm-fade{from{opacity:0}}
  @media (prefers-reduced-motion: reduce){.row,.track .elapsed,.track .today{animation:none;}}

  @media(max-width:1100px){
    .grid{grid-template-columns:minmax(0,1fr) 100px 130px minmax(200px,1fr);row-gap:0;}
    .acts{grid-column:1 / -1;justify-content:flex-start;padding:0 0 14px;}
  }
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .btn-new{display:none;}
    .content{padding:16px 16px 32px;}
    .rules{padding:14px;}
    .grid{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"who amt" "when when" "track track" "acts acts";padding:14px 16px;row-gap:8px;}
    .row{min-height:0;}
    .who{grid-area:who;padding:0;}
    .amt{grid-area:amt;align-self:start;}
    .when{grid-area:when;}
    .when small{display:inline;margin:0 0 0 6px;}
    .track-wrap{grid-area:track;padding:4px 0 0;}
    .acts{grid-area:acts;padding:0;justify-content:space-between;}
    .act.chase{flex:1;max-width:220px;}
  }

  /* Sheets */
  .backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,14,26,.55);animation:rm-fade var(--dur-2) var(--ease) both;}
  .modal{width:100%;max-width:540px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg2);color:var(--t1);border:1px solid var(--line2);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.35);animation:rm-up var(--dur-3) var(--ease) both;font-family:var(--font-manrope),sans-serif;} /* taste-skill-ignore: dialog */
  @keyframes rm-up{from{opacity:0;transform:translateY(12px) scale(.985)}}
  .m-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--line);}
  .m-title{font-size:16px;font-weight:700;}
  .m-sub{font-size:13px;color:var(--t2);margin-top:3px;font-variant-numeric:tabular-nums;}
  .m-close{flex:none;width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--t2);cursor:pointer;}
  .m-close:hover{background:var(--surface);color:var(--t1);}
  .tabs{display:flex;gap:4px;padding:12px 22px 0;border-bottom:1px solid var(--line);}
  .tab{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 12px;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;background:transparent;color:var(--t2);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .tab[aria-selected="true"]{color:var(--t1);border-bottom-color:var(--g);}
  .m-body{padding:18px 22px;overflow-y:auto;flex:1;}
  .m-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 22px;border-top:1px solid var(--line);}
  .field{margin-bottom:14px;}
  .field label{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--t1);margin-bottom:6px;}
  .field label span{font-weight:500;color:var(--t3);}
  .input,.textarea{width:100%;background:var(--bg);border:1px solid var(--line2);border-radius:8px;color:var(--t1);font:500 14px var(--font-manrope),sans-serif;outline:none;transition:border-color var(--dur-1) var(--ease);}
  .input{height:40px;padding:0 12px;}
  .textarea{padding:10px 12px;min-height:200px;line-height:1.55;resize:vertical;}
  .input:focus,.textarea:focus{border-color:var(--g);}
  .hint{font-size:13px;color:var(--t2);line-height:1.5;margin-bottom:14px;}
  .hint.warn{color:var(--st-late);}
  .err{font-size:13px;color:var(--st-late);margin-bottom:10px;}
  .btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .btn:hover{border-color:var(--t3);}
  .btn.primary{background:var(--g);border-color:var(--g);color:#1F2A44;}
  .btn.primary:hover{background:#FFB81C;}
  .btn:disabled{opacity:.5;cursor:not-allowed;}
  .btn.left{margin-right:auto;}
  .done{text-align:center;padding:28px 0 12px;}
  .done .tick{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;background:color-mix(in srgb,var(--g) 16%,transparent);color:var(--st-paid);}
  .done h3{font-size:16px;font-weight:700;margin-bottom:6px;}
  .done p{font-size:13px;color:var(--t2);margin-bottom:18px;}
  @media(max-width:600px){
    .backdrop{align-items:flex-end;padding:0;}
    .modal{max-width:none;border-radius:16px 16px 0 0;max-height:92vh;}
  }
`

type ComposeState = {
  inv:       Invoice
  tab:       'email' | 'whatsapp'
  emailTo:   string
  emailBody: string
  waBody:    string
  sending:   boolean
  sent:      boolean
  sentVia:   'email' | 'whatsapp'
  copied:    boolean
  err:       string
}

type Mark = { day: number; state: 'plan' | 'sched' | 'sent' | 'fail' }

// Stops sit evenly along the track (a week before due, due, then each stage);
// days in between are placed proportionally within their gap.
const STOPS = [TRACK_MIN, 0, ...STAGES.map(s => s.day)]
function pos(day: number) {
  const d = Math.max(TRACK_MIN, Math.min(TRACK_MAX, day))
  let k = 0
  while (k < STOPS.length - 2 && d > STOPS[k + 1]) k++
  const frac = (d - STOPS[k]) / (STOPS[k + 1] - STOPS[k])
  return ((k + frac) / (STOPS.length - 1)) * 100
}

// Due date, each reminder stage and today, on one line.
function Track({ marks, days }: { marks: Mark[]; days: number }) {
  const today = pos(days)
  const shown = new Set(marks.map(m => m.day))
  return (
    <div className="track" aria-hidden="true">
      <span className="base" />
      <span className="elapsed" style={{ width: `${today}%` }} />
      <span className="due" style={{ left: `${pos(0)}%` }} />
      <span className="lbl" style={{ left: `${pos(0)}%` }}>Due</span>
      {STAGES.filter(s => !shown.has(s.day)).map(s => (
        <span key={`off${s.day}`}>
          <span className="mk off" style={{ left: `${pos(s.day)}%` }} />
          <span className="lbl off" style={{ left: `${pos(s.day)}%` }}>+{s.day}</span>
        </span>
      ))}
      {marks.map(m => (
        <span key={m.day}>
          <span className={`mk ${m.state}`} style={{ left: `${pos(m.day)}%` }} />
          <span className="lbl" style={{ left: `${pos(m.day)}%` }}>+{m.day}</span>
        </span>
      ))}
      <span className="today" style={{ left: `${today}%` }} />
    </div>
  )
}

export default function RemindersClient({
  initialInvoices,
  initialReminders,
  firmName,
  currency = 'P',
  initialWaOn = false,
  initialDays = DEFAULT_REMINDER_DAYS,
  waConfigured = false,
}: {
  initialInvoices:  Invoice[]
  initialReminders: Reminder[]
  firmName:         string
  currency?:        string
  initialWaOn?:     boolean
  initialDays?:     number[]
  waConfigured?:    boolean
}) {
  const [invoices,  setInvoices]  = useState<Invoice[]>(initialInvoices)
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [toggling,  setToggling]  = useState<Record<string, boolean>>({})
  const [remError,  setRemError]  = useState<string | null>(null)
  const [schedule,  setSchedule]  = useState<Record<number, boolean>>(
    () => Object.fromEntries(STAGES.map(s => [s.day, initialDays.includes(s.day)]))
  )
  const [waOn,      setWaOn]      = useState(initialWaOn)
  const [compose,   setCompose]   = useState<ComposeState | null>(null)
  const [contactModal, setContactModal] = useState<{ inv: Invoice; email: string; phone: string } | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // The chosen days are saved on the account; invoices sent from now on use them.
  function toggleDay(day: number) {
    const next = { ...schedule, [day]: !schedule[day] }
    setSchedule(next)
    fetch('/api/profile', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder_days: STAGES.filter(s => next[s.day]).map(s => s.day) }),
    }).catch(() => {})
  }

  function toggleWa() {
    const next = !waOn
    setWaOn(next)
    fetch('/api/profile', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_reminders_enabled: next }),
    }).catch(() => {})
  }

  const pending = useMemo(
    () => invoices.filter(i => ACTIVE_STATUSES.includes(i.status)),
    [invoices]
  )

  const byInvoice = useMemo(() => {
    const map: Record<string, Reminder[]> = {}
    for (const r of reminders) (map[r.invoice_id] ??= []).push(r)
    return map
  }, [reminders])

  const activeDays = STAGES.filter(s => schedule[s.day]).map(s => s.day)
  const waUsable = waConfigured && waOn

  // Most overdue first; then whatever falls due soonest.
  const groups = useMemo(() => {
    const rows = pending.map(inv => ({ inv, days: daysOverdue(inv.due_date) }))
      .sort((a, b) => (b.days - a.days) || a.inv.client_name.localeCompare(b.inv.client_name))
    return [
      { key: 'late',  title: 'Late',                 rows: rows.filter(r => r.inv.due_date && r.days > 0) },
      { key: 'soon',  title: 'Due in the next week', rows: rows.filter(r => r.inv.due_date && r.days <= 0 && r.days >= -7) },
      { key: 'later', title: 'Due later',            rows: rows.filter(r => !r.inv.due_date || r.days < -7) },
    ].filter(g => g.rows.length)
  }, [pending])

  // The summary only adds up money in the account's main currency.
  const here = pending.filter(i => (i.currency || 'P') === currency)
  const owed = here.reduce((s, i) => s + Number(i.total || 0), 0)
  const lateRows = here.filter(i => i.due_date && daysOverdue(i.due_date) > 0)
  const lateSum = lateRows.reduce((s, i) => s + Number(i.total || 0), 0)

  const nextUp = useMemo(() => {
    const ids = new Set(pending.map(i => i.id))
    const now = Date.now()
    const queued = reminders
      .filter(r => r.status === 'scheduled' && ids.has(r.invoice_id) && new Date(r.send_at).getTime() >= now - DAY)
      .sort((a, b) => a.send_at.localeCompare(b.send_at))
    if (!queued.length) return null
    const first = queued[0]
    const sameDay = queued.filter(r => r.send_at.slice(0, 10) === first.send_at.slice(0, 10) && r.invoice_id === first.invoice_id)
    return {
      date: new Date(first.send_at),
      inv: pending.find(i => i.id === first.invoice_id)!,
      channels: [...new Set(sameDay.map(r => r.channel))],
    }
  }, [reminders, pending])

  function openCompose(inv: Invoice) {
    setCompose({
      inv,
      tab:       inv.client_email || !inv.client_phone ? 'email' : 'whatsapp',
      emailTo:   inv.client_email || '',
      emailBody: genEmail(inv, firmName),
      waBody:    genWhatsApp(inv, firmName),
      sending:   false,
      sent:      false,
      sentVia:   'email',
      copied:    false,
      err:       '',
    })
  }

  async function sendEmail() {
    if (!compose) return
    setCompose(p => p ? { ...p, sending: true, err: '' } : null)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: compose.inv.id, to_email: compose.emailTo, custom_body: compose.emailBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setCompose(p => p ? { ...p, sending: false, sent: true, sentVia: 'email' } : null)
    } catch (e: any) {
      setCompose(p => p ? { ...p, sending: false, err: e.message } : null)
    }
  }

  function sendWhatsApp() {
    if (!compose) return
    const phone = compose.inv.client_phone
    if (!phone) return
    openWhatsApp(phone, compose.waBody)
    setCompose(p => p ? { ...p, sent: true, sentVia: 'whatsapp' } : null)
  }

  async function saveContact() {
    if (!contactModal) return
    setContactSaving(true)
    try {
      const res = await fetch(`/api/invoices/${contactModal.inv.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_email: contactModal.email || null,
          client_phone: contactModal.phone || null,
        }),
      })
      if (!res.ok) return
      const updated = { ...contactModal.inv, client_email: contactModal.email || null, client_phone: contactModal.phone || null }
      setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i))
      setContactModal(null)
      // Retry turning auto on with the updated invoice
      await toggleAuto(updated, false)
    } finally {
      setContactSaving(false)
    }
  }

  function copyWa() {
    if (!compose) return
    navigator.clipboard.writeText(compose.waBody).then(() => {
      setCompose(p => p ? { ...p, copied: true } : null)
      setTimeout(() => setCompose(p => p ? { ...p, copied: false } : null), 2000)
    })
  }

  function channelsFor(inv: Invoice) {
    const ch: Array<'email' | 'whatsapp'> = []
    if (inv.client_email) ch.push('email')
    if (waUsable && inv.client_phone) ch.push('whatsapp')
    return ch
  }

  // The stage that would go out straight away if auto were turned on now.
  function dueNowStage(inv: Invoice) {
    const days = daysOverdue(inv.due_date)
    if (!inv.due_date) return null
    const past = activeDays.filter(d => d <= days)
    return past.length ? past[past.length - 1] : null
  }

  async function toggleAuto(inv: Invoice, isOn: boolean) {
    if (toggling[inv.id]) return
    setToggling(p => ({ ...p, [inv.id]: true }))

    if (isOn) {
      const toDelete = reminders.filter(r => r.invoice_id === inv.id && r.status === 'scheduled')
      await Promise.all(toDelete.map(r =>
        fetch(`/api/reminders/${r.id}`, { method: 'DELETE', credentials: 'include' })
      ))
      setReminders(prev => prev.filter(r => !(r.invoice_id === inv.id && r.status === 'scheduled')))
    } else {
      const channels = channelsFor(inv)
      if (channels.length === 0) {
        setContactModal({ inv, email: inv.client_email || '', phone: inv.client_phone || '' })
        setToggling(p => ({ ...p, [inv.id]: false }))
        return
      }
      const base = inv.due_date ? localDay(inv.due_date) : todayStart()
      const sendNow = dueNowStage(inv)
      const already = byInvoice[inv.id] ?? []
      const created: Reminder[] = []
      let lastErrMsg = ''
      for (const ch of channels) {
        for (const day of activeDays) {
          const sendAt = new Date(base.getTime() + day * DAY)
          const isPast = sendAt <= new Date()
          // A late invoice gets only its latest missed stage now, not every stage it has passed.
          if (isPast && day !== sendNow) continue
          if (isPast && already.some(r => r.channel === ch && r.status === 'sent' && reminderDay(r, inv.due_date) >= day)) continue

          const commonPayload = {
            invoice_id:      inv.id,
            channel:         ch,
            days_after_due:  day,
            recipient_email: ch === 'email'    ? inv.client_email : undefined,
            recipient_phone: ch === 'whatsapp' ? inv.client_phone : undefined,
          }

          const res = isPast
            ? await fetch('/api/reminders/send-now', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commonPayload),
              })
            : await fetch('/api/reminders', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...commonPayload, send_at: sendAt.toISOString() }),
              })

          if (res.ok) {
            const { reminder } = await res.json()
            if (reminder) created.push(reminder)
          } else {
            try {
              const errData = await res.json()
              lastErrMsg = errData.error || `HTTP ${res.status}`
            } catch { lastErrMsg = `HTTP ${res.status}` }
          }
        }
      }
      if (created.length > 0) {
        setReminders(prev => [...prev, ...created])
      } else {
        setRemError(lastErrMsg
          ? `Could not turn on reminders: ${lastErrMsg}`
          : activeDays.length === 0
            ? 'Pick at least one day in the schedule first.'
            : 'Every reminder day for this invoice has already passed.')
        setTimeout(() => setRemError(null), 5000)
      }
    }
    setToggling(p => ({ ...p, [inv.id]: false }))
  }

  let rowIndex = 0

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-title">Reminders</h1>
        <Link href="/new-invoice" className="btn-new press">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          New invoice
        </Link>
      </div>

      <div className="content">
        {pending.length > 0 && (
          <>
            <p className="finding">
              <b>{money(owed, currency)}</b> is waiting on {plural(here.length, 'invoice')}.{' '}
              {lateRows.length === 0
                ? 'None of it is late yet.'
                : <><b className="late">{money(lateSum, currency)}</b> of it is late, on {plural(lateRows.length, 'invoice')}.</>}
            </p>
            <p className="next">
              {nextUp
                ? <>Next reminder: <b>{shortDate(nextUp.date, true)}</b> to {nextUp.inv.client_name}, by {nextUp.channels.map(c => c === 'email' ? 'email' : 'WhatsApp').join(' and ')}.</>
                : 'No automatic reminders are queued. Turn on Auto for an invoice to start.'}
            </p>
          </>
        )}

        {remError && <div className="note" role="alert">{remError}</div>}

        <div className="rules">
          <span className="lead">Auto reminders go out</span>
          <span className="chips" role="group" aria-label="Days after the due date">
            {STAGES.map(s => (
              <button key={s.day} type="button" className="chip press" aria-pressed={!!schedule[s.day]} title={s.desc} onClick={() => toggleDay(s.day)}>{s.day}</button>
            ))}
          </span>
          <span>days after the due date, by</span>
          <span className="chips" role="group" aria-label="Channels">
            <span className="chip fixed" title="Email is always used when the client has an address">Email</span>
            <button
              type="button" className="chip press"
              aria-pressed={waUsable}
              disabled={!waConfigured}
              title={waConfigured ? 'Also send automatic reminders on WhatsApp' : 'Automatic WhatsApp needs the WhatsApp Business setup'}
              onClick={toggleWa}
            >
              <svg className="wa-i" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={WA_PATH}/></svg>
              WhatsApp
            </button>
          </span>
          <span className="aside">
            They start by themselves when you send an invoice. New days apply to invoices you send from now on.
            {!waConfigured && ' Automatic WhatsApp needs the WhatsApp Business setup; Chase still opens WhatsApp for you.'}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="empty">
            <h2>Nobody to chase</h2>
            <p>Every invoice you have sent is paid. Reminders show up here once an invoice is sent and waiting.</p>
            <Link href="/new-invoice" className="btn-new press">New invoice</Link>
          </div>
        ) : groups.map(g => (
          <section key={g.key} className={`group ${g.key}`} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`}>{g.title} <span className="n">{g.rows.length}</span></h2>
            <div className="sheet">
              {g.rows.map(({ inv, days }) => {
                const i = rowIndex++
                const sym = inv.currency || 'P'
                const rems = byInvoice[inv.id] ?? []
                const queued = rems.filter(r => r.status === 'scheduled')
                const sent = rems.filter(r => r.status === 'sent')
                const failed = rems.filter(r => r.status === 'failed')
                const isOn = queued.length > 0
                const late = !!inv.due_date && days > 0

                // One mark per day; a failure outranks a send, a send outranks a queued one.
                const rank = { plan: 0, sched: 1, sent: 2, fail: 3 } as const
                const marks: Record<number, Mark> = {}
                for (const r of rems) {
                  if (r.status === 'cancelled') continue
                  const day = reminderDay(r, inv.due_date)
                  const state: Mark['state'] = r.status === 'sent' ? 'sent' : r.status === 'failed' ? 'fail' : 'sched'
                  if (!marks[day] || rank[state] > rank[marks[day].state]) marks[day] = { day, state }
                }
                if (!isOn) for (const d of activeDays) if (!marks[d]) marks[d] = { day: d, state: 'plan' }
                const markList = Object.values(marks).sort((a, b) => a.day - b.day)

                const due = inv.due_date ? localDay(inv.due_date) : null
                const whenText = !due ? 'No due date'
                  : days > 0 ? `${plural(days, 'day')} late`
                  : days === 0 ? 'Due today'
                  : days === -1 ? 'Due tomorrow'
                  : `Due in ${plural(-days, 'day')}`

                const lastSent = sent.map(r => r.sent_at || r.send_at).sort().pop()
                const nextQ = [...queued].sort((a, b) => a.send_at.localeCompare(b.send_at))[0]
                const stuckWa = !waConfigured && queued.some(r => r.channel === 'whatsapp')
                const cap = failed.length && !queued.length
                  ? { warn: true, text: `${plural(failed.length, 'reminder')} failed to send` }
                  : {
                      warn: false,
                      text: [
                        sent.length ? `${sent.length} sent, last ${shortDate(new Date(lastSent!))}` : null,
                        nextQ ? `next ${shortDate(new Date(nextQ.send_at))}` : null,
                        !isOn && !sent.length ? (dueNowStage(inv) != null ? `Auto would send the ${dueNowStage(inv)}-day reminder now` : 'Auto is off') : null,
                      ].filter(Boolean).join(' · ') || 'Auto is off',
                    }
                const summary = `${sent.length} sent, ${queued.length} queued${failed.length ? `, ${failed.length} failed` : ''}.`

                return (
                  <div key={inv.id} className={`grid row${late ? ' late' : ''}`} style={{ ['--i' as string]: Math.min(i, 12) }}>
                    <div className="who">
                      <span className="client">{inv.client_name}</span>
                      <span className="ref">{inv.invoice_number}{inv.project ? ` · ${inv.project}` : ''}</span>
                    </div>
                    <span className="amt">{money(Number(inv.total || 0), sym)}</span>
                    <span className={`when${late ? ' late' : ''}`}>
                      {whenText}
                      {due && <small>{days > 0 ? 'was due' : 'due'} {shortDate(due, true)}</small>}
                    </span>
                    <div className="track-wrap">
                      <Track marks={markList} days={inv.due_date ? days : TRACK_MIN} />
                      <span className={`cap${cap.warn ? ' warn' : ''}`} title={stuckWa ? "Queued WhatsApp reminders can't send until WhatsApp Business is set up" : undefined}>
                        {cap.text}{stuckWa && !cap.warn && <> · <span className="warn">WhatsApp not set up</span></>}
                      </span>
                      <span className="sr">Reminders: {summary}</span>
                    </div>
                    <div className="acts">
                      <button
                        type="button" role="switch" className="sw"
                        aria-checked={isOn}
                        aria-label={`Automatic reminders for ${inv.invoice_number}`}
                        disabled={!!toggling[inv.id]}
                        onClick={() => toggleAuto(inv, isOn)}
                      >
                        <span className="knob" aria-hidden="true" />
                        {toggling[inv.id] ? 'Saving…' : 'Auto'}
                      </button>
                      <button type="button" className="act chase press" onClick={() => openCompose(inv)}>Chase</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sheets render into <body> so no wrapper on the page can sit above them. */}
      {mounted && createPortal(<>
        {contactModal && (
          <div className="backdrop" onClick={() => !contactSaving && setContactModal(null)}>
            <div className="modal" style={{ maxWidth: 440 }} role="dialog" aria-modal="true" aria-labelledby="ct-title" onClick={e => e.stopPropagation()}>
              <div className="m-head">
                <div>
                  <div className="m-title" id="ct-title">Add contact details</div>
                  <div className="m-sub">{contactModal.inv.client_name} · {contactModal.inv.invoice_number}</div>
                </div>
                <button type="button" className="m-close" aria-label="Close" onClick={() => setContactModal(null)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
                </button>
              </div>
              <div className="m-body">
                <p className="hint">Auto reminders need an email address{waUsable ? ' or a WhatsApp number' : ''}. These are saved to the invoice.</p>
                <div className="field">
                  <label htmlFor="rm-contact-email">Email</label>
                  <input id="rm-contact-email" name="contact_email" className="input" type="email" placeholder="Client’s email address"
                    value={contactModal.email}
                    onChange={e => setContactModal(p => p ? { ...p, email: e.target.value } : null)} />
                </div>
                <div className="field">
                  <label htmlFor="rm-contact-phone">Phone</label>
                  <input id="rm-contact-phone" name="contact_phone" className="input" type="tel" placeholder="71 234 567"
                    value={contactModal.phone}
                    onChange={e => setContactModal(p => p ? { ...p, phone: e.target.value } : null)} />
                </div>
              </div>
              <div className="m-foot">
                <button type="button" className="btn" onClick={() => setContactModal(null)}>Cancel</button>
                <button
                  type="button" className="btn primary"
                  onClick={saveContact}
                  disabled={contactSaving || (!contactModal.email && !(waUsable && contactModal.phone))}
                >{contactSaving ? 'Saving…' : 'Save and turn on'}</button>
              </div>
            </div>
          </div>
        )}

        {compose && (
          <div className="backdrop" onClick={() => !compose.sending && setCompose(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cp-title" onClick={e => e.stopPropagation()}>
              <div className="m-head">
                <div style={{ minWidth: 0 }}>
                  <div className="m-title" id="cp-title">Chase {compose.inv.client_name}</div>
                  <div className="m-sub">
                    {compose.inv.invoice_number} · {money(compose.inv.total, compose.inv.currency || 'P')}
                    {compose.inv.due_date ? ` · due ${shortDate(localDay(compose.inv.due_date), true)}` : ''}
                  </div>
                </div>
                <button type="button" className="m-close" aria-label="Close" onClick={() => setCompose(null)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
                </button>
              </div>

              {!compose.sent ? (
                <>
                  <div className="tabs" role="tablist">
                    <button type="button" role="tab" className="tab" aria-selected={compose.tab === 'email'} onClick={() => setCompose(p => p ? { ...p, tab: 'email' } : null)}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="2"/><path d="M2 5l6 4 6-4"/></svg>
                      Email
                    </button>
                    <button type="button" role="tab" className="tab" aria-selected={compose.tab === 'whatsapp'} onClick={() => setCompose(p => p ? { ...p, tab: 'whatsapp' } : null)}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={WA_PATH}/></svg>
                      WhatsApp
                    </button>
                  </div>

                  <div className="m-body">
                    {compose.tab === 'email' ? (
                      <>
                        <div className="field">
                          <label htmlFor="rm-compose-email">To</label>
                          <input id="rm-compose-email" name="compose_email" className="input" type="email" placeholder="Client’s email address"
                            value={compose.emailTo} onChange={e => setCompose(p => p ? { ...p, emailTo: e.target.value } : null)} />
                        </div>
                        <div className="field">
                          <label htmlFor="rm-email-body">Message <span>Edit before sending</span></label>
                          <textarea id="rm-email-body" name="email_body" className="textarea" value={compose.emailBody}
                            onChange={e => setCompose(p => p ? { ...p, emailBody: e.target.value } : null)} />
                        </div>
                        {compose.err && <div className="err" role="alert">{compose.err}</div>}
                      </>
                    ) : (
                      <>
                        {compose.inv.client_phone
                          ? <p className="hint">Opens WhatsApp on your phone with this message ready, sent from your own number to <b>{compose.inv.client_phone}</b>.</p>
                          : <p className="hint warn">This invoice has no phone number. Copy the message, or add a number to the invoice.</p>}
                        <div className="field">
                          <label htmlFor="rm-wa-body">Message <span>Edit if needed</span></label>
                          <textarea id="rm-wa-body" name="wa_body" className="textarea" value={compose.waBody}
                            onChange={e => setCompose(p => p ? { ...p, waBody: e.target.value } : null)} />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="m-foot">
                    {compose.tab === 'email' ? (
                      <>
                        <button type="button" className="btn" onClick={() => setCompose(null)}>Cancel</button>
                        <button type="button" className="btn primary press" onClick={sendEmail} disabled={compose.sending || !compose.emailTo}>
                          {compose.sending ? 'Sending…' : 'Send email'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn left" onClick={copyWa}>{compose.copied ? 'Copied' : 'Copy message'}</button>
                        <button
                          type="button" className="btn primary press"
                          onClick={sendWhatsApp}
                          disabled={!compose.inv.client_phone}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={WA_PATH}/></svg>
                          Open in WhatsApp
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="m-body">
                  <div className="done">
                    <div className="tick">
                      <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>
                    </div>
                    <h3>{compose.sentVia === 'whatsapp' ? 'Ready in WhatsApp' : 'Reminder sent'}</h3>
                    <p>
                      {compose.sentVia === 'whatsapp'
                        ? `WhatsApp opened for ${compose.inv.client_phone}. Tap send there to deliver it.`
                        : `Emailed to ${compose.emailTo}.`}
                    </p>
                    <button type="button" className="btn" onClick={() => setCompose(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>, document.body)}
    </>
  )
}
