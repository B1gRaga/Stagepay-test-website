import { redirect } from 'next/navigation'
import { createClient, getCachedUser, getCachedProfile } from '@/lib/supabase/server'
import Link from 'next/link'
import { PeriodSelect } from '@/components/portal/PeriodSelect'
import { PERIODS, type PeriodId } from '@/components/portal/periods'
import { InvoiceStatus, StatusMark, describeStatus, STATUS_CSS } from '@/components/portal/InvoiceStatus'
import { CountUp, RevealOnView } from '@/components/portal/DashMotion'

// StagePay is Botswana-first and profiles carry no timezone; dates and greetings use Gaborone time.
const TZ = 'Africa/Gaborone'
const DAY = 86_400_000
const HORIZON = 30 // days shown on the "due" timeline
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function periodSince(period: PeriodId, now: Date): string | null {
  const d = new Date(now)
  switch (period) {
    case '7d': d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
    case '30d': d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
    case '90d': d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0]
    case 'year': return `${now.getFullYear()}-01-01`
    case 'all': return null
  }
}

const PERIOD_WORDS: Record<PeriodId, string> = {
  '7d': 'in the last 7 days', '30d': 'in the last 30 days', '90d': 'in the last 90 days', year: 'this year', all: 'in total',
}

type Inv = {
  id: string; invoice_number: string; client_name: string; project: string | null
  total: number; status: string; issue_date: string | null; due_date: string | null; currency: string | null
}

const num = (n: number) => Math.round(n).toLocaleString('en')
const money = (n: number, sym: string) => `${sym}${num(n)}`
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d) // YYYY-MM-DD
const utc = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) }
const dayLabel = (s: string) => { const [, m, d] = s.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1]}` }
const firstWord = (s: string) => (s || '').split(' ')[0]

function sumIn(list: Inv[], sym: string) {
  return list.filter(i => (i.currency || sym) === sym).reduce((s, i) => s + Number(i.total || 0), 0)
}

// Never round up to "100%" or down to "0%" while some money is the other way.
function paidShare(paid: number, total: number) {
  const pct = (paid / total) * 100
  if (pct > 99 && paid < total) return 'over 99%'
  if (pct < 1 && paid > 0) return 'under 1%'
  return `${Math.round(pct)}%`
}

function names(list: Inv[]) {
  const n = [...new Set(list.map(i => i.client_name).filter(Boolean))]
  return n.length === 1 ? n[0] : n.length === 2 ? `${n[0]} and ${n[1]}` : `${n.length} clients`
}

const CSS = `
${STATUS_CSS}
  :root{--hero:#1F2A44;--hero-t1:#FAF7F0;--hero-t2:rgba(250,247,240,.7);--hero-t3:rgba(250,247,240,.42);--hero-line:rgba(250,247,240,.14);--hero-late:#FF8B7B;}
  html:not([data-theme="light"]){--hero:#0F1729;}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .btn-new{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:8px;background:var(--g);color:#1F2A44;font-size:14px;font-weight:700;text-decoration:none;}
  .btn-new:hover{background:#FFB81C;}
  .content{padding:24px 28px 48px;max-width:1180px;}
  a:focus-visible,.bar:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px;}

  /* ── Hero: the one dark field on the page ── */
  .hero{background:var(--hero);color:var(--hero-t1);border-radius:16px;padding:26px 28px 22px;}
  .hello{font-size:15px;color:var(--hero-t2);}
  .lead{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin-top:4px;max-width:30ch;}
  .lead .amt{color:var(--g);}
  .lead.is-late .amt{color:var(--hero-late);}

  .hero-figs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:22px;border-top:1px solid var(--hero-line);}
  .hf{display:block;padding:16px 20px 4px 0;text-decoration:none;color:inherit;}
  .hf + .hf{padding-left:20px;border-left:1px solid var(--hero-line);}
  .hf-label{font-size:14px;color:var(--hero-t2);}
  .hf-val{font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.15;margin-top:4px;font-variant-numeric:tabular-nums;}
  .hf-val .cur{color:var(--hero-t2);font-weight:600;margin-right:1px;}
  .hf-val.zero{color:var(--hero-t3);}
  .hf-val.zero .cur{color:inherit;}
  .hf.late .hf-val{color:var(--hero-late);}
  .hf.late .hf-val .cur{color:inherit;opacity:.8;}
  .hf-sub{font-size:13px;color:var(--hero-t2);margin-top:3px;}
  .hf:hover .hf-label{color:var(--hero-t1);}

  /* Due timeline: when money is meant to arrive. */
  .due{margin-top:22px;padding-top:18px;border-top:1px solid var(--hero-line);}
  .due-head{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--hero-t2);}
  .due-head b{color:var(--hero-t1);font-weight:600;}
  .track{position:relative;height:96px;margin:0 6px;}
  .rail{position:absolute;left:0;right:0;top:48px;height:2px;border-radius:2px;background:var(--hero-line);}
  .rail-late{position:absolute;left:0;top:48px;height:2px;width:8%;border-radius:2px;background:color-mix(in srgb,var(--hero-late) 45%,transparent);}
  .wk{position:absolute;top:44px;width:1px;height:10px;background:var(--hero-line);}
  .today{position:absolute;top:36px;width:2px;height:26px;margin-left:-1px;border-radius:2px;background:var(--hero-t1);}
  .today-l{position:absolute;top:66px;transform:translateX(-50%);font-size:12px;font-weight:600;color:var(--hero-t1);white-space:nowrap;}
  .end-l{position:absolute;right:0;top:66px;font-size:12px;color:var(--hero-t3);white-space:nowrap;}
  .mk{position:absolute;top:49px;transform:translate(-50%,-50%);display:block;border-radius:50%;background:var(--g);box-shadow:0 0 0 3px var(--hero);text-decoration:none;}
  .mk.late{background:var(--hero-late);}
  .mk-l{position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;line-height:1.25;color:var(--hero-t1);text-align:center;pointer-events:none;}
  .mk-l small{display:block;color:var(--hero-t2);font-size:11.5px;}
  .mk-l.up{bottom:calc(100% + 8px);}
  .mk-l.down{top:calc(100% + 8px);}
  .mk-l.start{left:0;transform:none;text-align:left;}
  .mk-l.end{left:auto;right:0;transform:none;text-align:right;}
  .due-empty{font-size:14px;color:var(--hero-t2);padding:14px 0 6px;}

  /* ── Panels ── */
  .cols{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px;align-items:start;margin-top:20px;}
  .panel{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;padding:0 20px;border-bottom:1px solid var(--line);}
  .panel-head h2{font-size:15px;font-weight:700;color:var(--t1);}
  .panel-link{font-size:13px;font-weight:600;color:var(--t2);text-decoration:none;}
  .panel-link:hover{color:var(--t1);}

  .item{position:relative;display:grid;grid-template-columns:20px minmax(0,1fr) auto;column-gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;transition:background-color var(--dur-1) var(--ease);}
  .item:last-child{border-bottom:0;}
  .item:hover{background:color-mix(in srgb,var(--t1) 4%,transparent);}
  .item-name{font-size:14px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .item-sub{font-size:13px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .item-sub .st{font-size:13px;}
  .item-sub .st-mark,.item-act .st-mark{display:none;}
  .item-amt{font-size:15px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;}
  .item-amt .cur{color:var(--t2);font-weight:600;margin-right:1px;}
  .item-act{display:block;font-size:12px;font-weight:600;color:var(--t2);margin-top:2px;text-align:right;}
  .item-act .st{font-size:12px;}
  .item:hover .item-act{color:var(--t1);}

  .when{display:grid;grid-template-columns:52px minmax(0,1fr);column-gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;}
  .when:last-child{border-bottom:0;}
  .when:hover{background:color-mix(in srgb,var(--t1) 4%,transparent);}
  .when-date{font-size:13px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;}
  .when-what{font-size:13px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .when-what b{color:var(--t1);font-weight:600;}

  .quiet{padding:22px 20px;font-size:14px;color:var(--t2);}
  .quiet a{color:var(--t1);font-weight:700;text-decoration:underline;text-decoration-color:var(--g);text-decoration-thickness:2px;text-underline-offset:4px;}

  /* Six months: invoiced per month, the paid part in gold. */
  .months{margin-top:20px;}
  .months-sum{padding:16px 20px 0;font-size:14px;color:var(--t2);}
  .months-sum b{color:var(--t1);font-variant-numeric:tabular-nums;}
  .chart{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;align-items:end;height:200px;padding:28px 20px 0;}
  .col{display:flex;flex-direction:column;justify-content:flex-end;height:100%;position:relative;}
  .bar{position:relative;display:flex;flex-direction:column;justify-content:flex-end;border-radius:6px 6px 2px 2px;background:var(--surface2);overflow:visible;min-height:3px;outline:none;transform-origin:bottom;}
  html[data-theme="light"] .bar{background:var(--surface);}
  .bar .paid{border-radius:inherit;border-top-left-radius:0;border-top-right-radius:0;background:var(--st-paid);}
  .bar .paid.full{border-radius:6px 6px 2px 2px;}
  .bar-v{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--t1);white-space:nowrap;font-variant-numeric:tabular-nums;opacity:0;transition:opacity var(--dur-1) var(--ease);}
  .col.now .bar-v,.bar:hover .bar-v,.bar:focus-visible .bar-v{opacity:1;}
  .bar-tip{position:absolute;bottom:calc(100% + 26px);left:50%;transform:translateX(-50%);z-index:2;padding:6px 9px;border-radius:8px;background:var(--t1);color:var(--bg);font-size:12px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity var(--dur-1) var(--ease);}
  .bar:hover .bar-tip,.bar:focus-visible .bar-tip{opacity:1;}
  .col.now .bar-tip{bottom:calc(100% + 26px);}
  .mlabels{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;padding:8px 20px 16px;font-size:12px;color:var(--t2);text-align:center;}
  .mlabels .now{color:var(--t1);font-weight:700;}
  .legend{display:flex;gap:16px;padding:0 20px 16px;font-size:12px;color:var(--t2);}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px;background:var(--surface2);}
  html[data-theme="light"] .legend i.unpaid{background:var(--surface);}
  .legend i.paid{background:var(--st-paid);}

  .period{margin-top:20px;}
  .period-sum{padding:16px 20px;border-bottom:1px solid var(--line);font-size:14px;color:var(--t2);}
  .period-sum b{color:var(--t1);font-size:15px;font-variant-numeric:tabular-nums;}
  .period-select{height:32px;padding:0 28px 0 10px;border-radius:8px;border:1px solid var(--line2);background:var(--bg2);color:var(--t1);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;}
  .period-select:focus-visible{outline:2px solid var(--g);outline-offset:2px;}

  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}

  /* ── Motion: played once, each move shows a value arriving ──
     Hero: on load. Timeline: the rail draws from today, then each due date lands.
     Chart: held until it scrolls into view (RevealOnView adds .armed / .in). */
  @media (prefers-reduced-motion: no-preference){
    .rise{animation:d-rise 800ms var(--ease) both;animation-delay:calc(var(--i,0) * 140ms);}
    .rail{transform-origin:left;animation:d-draw 1400ms var(--ease) 700ms both;}
    .rail-late{transform-origin:right;animation:d-draw 800ms var(--ease) 700ms both;}
    .wk{animation:d-fade 450ms var(--ease) both;animation-delay:calc(950ms + var(--w,0) * 180ms);}
    .today{transform-origin:bottom;animation:d-grow 650ms var(--ease) 650ms both;}
    .today-l,.end-l{animation:d-fade 600ms var(--ease) 1100ms both;}
    .mk{animation:d-land 900ms cubic-bezier(.34,1.56,.64,1) both;animation-delay:calc(1550ms + var(--i,0) * 220ms);}
    .mk-l{animation:d-fade 600ms var(--ease) both;animation-delay:calc(2100ms + var(--i,0) * 220ms);}
    .mk.first::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid currentColor;color:var(--g);opacity:0;animation:d-ring 1600ms var(--ease) 2300ms 1 both;pointer-events:none;}
    .mk.first.late::after{color:var(--hero-late);}

    .months .bar{animation:d-grow 1050ms var(--ease) both;animation-delay:calc(250ms + var(--i,0) * 140ms);}
    .months .bar .paid{transform-origin:bottom;animation:d-grow 800ms var(--ease) both;animation-delay:calc(1000ms + var(--i,0) * 140ms);}
    .months .bar-v{animation:d-fade 600ms var(--ease) both;animation-delay:calc(1250ms + var(--i,0) * 140ms);}
    .months.armed .bar,.months.armed .bar .paid{animation:none;transform:scaleY(0);}
    .months.armed .bar-v{animation:none;opacity:0;}
  }
  @keyframes d-rise{from{opacity:0;transform:translateY(16px)}}
  @keyframes d-grow{from{transform:scaleY(0)}}
  @keyframes d-draw{from{transform:scaleX(0)}}
  @keyframes d-land{from{opacity:0;transform:translate(-50%,-260%) scale(.6)}}
  @keyframes d-fade{from{opacity:0}}
  @keyframes d-ring{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}

  @media(max-width:1000px){.cols{grid-template-columns:1fr;}}
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .btn-new{display:none;}
    .content{padding:16px 16px 40px;}
    .hero{padding:20px 18px 16px;border-radius:14px;}
    .lead{font-size:21px;}
    .hero-figs{grid-template-columns:1fr;}
    .hf,.hf + .hf{display:grid;grid-template-columns:1fr auto;align-items:baseline;padding:12px 0;border-left:0;}
    .hf + .hf{border-top:1px solid var(--hero-line);}
    .hf-val{font-size:22px;margin:0;grid-row:1 / span 2;grid-column:2;}
    .mk-l.extra{display:none;}
    .chart{gap:8px;height:170px;padding:28px 16px 0;}
    .mlabels{gap:8px;padding:8px 16px 14px;}
    .panel-head,.item,.when,.period-sum,.quiet,.months-sum,.legend{padding-left:16px;padding-right:16px;}
    .panel-head{flex-wrap:wrap;row-gap:8px;padding-top:12px;padding-bottom:12px;}
  }
`

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const { period: periodParam } = await searchParams
  const period: PeriodId = PERIODS.some(p => p.id === periodParam) ? (periodParam as PeriodId) : '30d'

  const supabase = await createClient()
  const now = new Date()
  const since = periodSince(period, now)
  const today = ymd(now)
  const [ty, tm] = today.split('-').map(Number)

  // The six calendar months ending with this one, oldest first.
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(Date.UTC(ty, tm - 1 - (5 - k), 1))
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, name: MONTHS[d.getUTCMonth()] }
  })

  const COLS = 'id, invoice_number, client_name, project, total, status, issue_date, due_date, currency'
  const [{ data: openRaw }, { data: periodRaw }, { data: sixRaw }, profile] = await Promise.all([
    supabase.from('invoices').select(COLS).eq('user_id', user.id)
      .in('status', ['draft', 'sent', 'pending', 'overdue'])
      .order('due_date', { ascending: true, nullsFirst: false }).limit(300),
    (() => {
      let q = supabase.from('invoices').select(COLS).eq('user_id', user.id).neq('status', 'cancelled')
      if (since) q = q.gte('issue_date', since)
      return q.order('created_at', { ascending: false }).limit(500)
    })(),
    supabase.from('invoices').select('total, status, issue_date, currency').eq('user_id', user.id)
      .neq('status', 'cancelled').gte('issue_date', `${months[0].key}-01`).limit(2000),
    getCachedProfile(user.id),
  ])
  const open = (openRaw ?? []) as Inv[]
  const inPeriod = (periodRaw ?? []) as Inv[]

  // Reminders: sent ones give the second tick; scheduled ones are "Coming up".
  const ids = [...new Set([...open, ...inPeriod.slice(0, 8)].map(i => i.id))]
  const { data: rems } = ids.length
    ? await supabase.from('reminders').select('invoice_id, status, send_at, channel')
        .in('invoice_id', ids).in('status', ['sent', 'scheduled']).order('send_at', { ascending: true })
    : { data: [] as { invoice_id: string; status: string; send_at: string; channel: string }[] }
  const sentCount: Record<string, number> = {}
  for (const r of rems ?? []) if (r.status === 'sent') sentCount[r.invoice_id] = (sentCount[r.invoice_id] ?? 0) + 1
  const byId = new Map(open.map(i => [i.id, i]))
  const upcoming = (rems ?? [])
    .filter(r => r.status === 'scheduled' && new Date(r.send_at) >= now && byId.has(r.invoice_id))
    .slice(0, 5)

  const sym = profile?.default_currency || 'P'
  const late = open.filter(i => i.status === 'overdue')
  const waiting = open.filter(i => i.status === 'sent' || i.status === 'pending')
  const drafts = open.filter(i => i.status === 'draft')
  const otherCurrency = open.some(i => (i.currency || sym) !== sym)
  const needs = [...late, ...waiting, ...drafts].slice(0, 6)

  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(now))
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = firstWord(profile?.name || profile?.firm_name || '')

  // ── Due timeline: sent/late invoices placed by due date, late ones before today. ──
  const LATE_W = 8, TODAY_X = 10
  const xFor = (d: number) => TODAY_X + (Math.min(d, HORIZON) / HORIZON) * (100 - TODAY_X)
  type Group = { x: number; days: number; list: Inv[]; late: boolean }
  const groups = new Map<string, Group>()
  let later = 0
  for (const inv of [...late, ...waiting]) {
    if (!inv.due_date) continue
    const days = Math.round((utc(inv.due_date) - utc(today)) / DAY)
    const isLate = inv.status === 'overdue' || days < 0
    if (!isLate && days > HORIZON) { later++; continue }
    const key = isLate ? 'late' : String(days)
    const g = groups.get(key) ?? { x: isLate ? LATE_W / 2 : xFor(days), days, list: [], late: isLate }
    g.list.push(inv)
    groups.set(key, g)
  }
  const dueGroups = [...groups.values()].sort((a, b) => a.x - b.x)
  const maxGroup = Math.max(1, ...dueGroups.map(g => sumIn(g.list, sym)))
  const dueSoon = waiting.filter(i => i.due_date && (utc(i.due_date) - utc(today)) / DAY <= HORIZON && utc(i.due_date) >= utc(today))
  const endDate = new Date(utc(today) + HORIZON * DAY).toISOString().slice(0, 10)

  // ── Six months ──
  const six = (sixRaw ?? []) as Pick<Inv, 'total' | 'status' | 'issue_date' | 'currency'>[]
  const series = months.map(m => {
    const rows = six.filter(i => (i.currency || sym) === sym && (i.issue_date || '').startsWith(m.key))
    const invoiced = rows.reduce((s, i) => s + Number(i.total || 0), 0)
    const paid = rows.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
    return { ...m, invoiced, paid, count: rows.length }
  })
  const sixTotal = series.reduce((s, m) => s + m.invoiced, 0)
  const sixPaid = series.reduce((s, m) => s + m.paid, 0)
  const maxMonth = Math.max(1, ...series.map(m => m.invoiced))
  const best = series.reduce((a, b) => (b.invoiced > a.invoiced ? b : a), series[0])

  const invoiced = sumIn(inPeriod, sym)
  const paid = sumIn(inPeriod.filter(i => i.status === 'paid'), sym)
  const recent = inPeriod.slice(0, 8)

  const lateSum = sumIn(late, sym), waitSum = sumIn(waiting, sym)
  const figs = [
    { key: 'waiting', label: 'Waiting', n: waiting.length, total: waitSum, sub: waiting.length ? `${waiting.length} sent, not paid yet` : 'Nothing out right now' },
    { key: 'late', label: 'Late', n: late.length, total: lateSum, sub: late.length ? `${late.length} past the due date` : 'Nothing is late' },
    { key: 'drafts', label: 'Drafts', n: drafts.length, total: sumIn(drafts, sym), sub: drafts.length ? `${drafts.length} not sent yet` : 'No drafts waiting' },
  ]

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-title">Dashboard</h1>
        <Link href="/new-invoice" className="btn-new press">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          New invoice
        </Link>
      </div>

      <div className="content">
        <section className="hero" aria-label="Where your money is">
          <p className="hello rise">{firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}</p>
          <p className={`lead rise${late.length ? ' is-late' : ''}`} style={{ ['--i' as string]: 1 }}>
            {late.length ? <><span className="amt"><CountUp value={lateSum} prefix={sym} delay={250} duration={1600} /></span> is late from {names(late)}.</>
              : waiting.length ? <><span className="amt"><CountUp value={waitSum} prefix={sym} delay={250} duration={1600} /></span> is waiting on {names(waiting)}. Nothing is late.</>
              : drafts.length ? <>{drafts.length === 1 ? 'One draft is' : `${drafts.length} drafts are`} ready to send.</>
              : <>Nobody owes you anything right now.</>}
          </p>

          <div className="hero-figs">
            {figs.map((f, i) => (
              <Link key={f.key} href="/invoices" className={`hf rise${f.key === 'late' && f.n ? ' late' : ''}`} style={{ ['--i' as string]: i + 2 }}>
                <div className="hf-label">{f.label}</div>
                <div className={`hf-val${f.n ? '' : ' zero'}`}>
                  {f.n ? <CountUp value={f.total} prefix={sym} delay={450 + i * 140} duration={1600} /> : <><span className="cur">{sym}</span>0</>}
                </div>
                <div className="hf-sub">{f.sub}</div>
              </Link>
            ))}
          </div>

          <div className="due rise" style={{ ['--i' as string]: 5 }}>
            <div className="due-head">
              <span>Due in the next {HORIZON} days</span>
              <span>
                {dueSoon.length ? <><b>{money(sumIn(dueSoon, sym), sym)}</b> expected</> : 'Nothing due'}
                {later > 0 && <> · {later} due later</>}
              </span>
            </div>
            {dueGroups.length === 0 ? (
              <p className="due-empty">No sent invoices are due in the next {HORIZON} days.</p>
            ) : (
              <div className="track">
                <span className="rail" />
                {late.length > 0 && <span className="rail-late" />}
                {[7, 14, 21, 28].map((d, w) => <span key={d} className="wk" style={{ left: `${xFor(d)}%`, ['--w' as string]: w }} />)}
                <span className="today" style={{ left: `${TODAY_X}%` }} />
                <span className="today-l" style={{ left: `${TODAY_X}%` }}>Today</span>
                <span className="end-l">{dayLabel(endDate)}</span>
                {dueGroups.map((g, i) => {
                  const total = sumIn(g.list, sym)
                  const size = Math.round(10 + 10 * Math.sqrt(total / maxGroup))
                  const who = g.list.length === 1 ? firstWord(g.list[0].client_name) : `${g.list.length} invoices`
                  const when = g.late ? 'Late' : g.days === 0 ? 'Today' : g.days === 1 ? 'Tomorrow' : dayLabel(g.list[0].due_date!)
                  const edge = g.x < 14 ? ' start' : g.x > 86 ? ' end' : ''
                  const href = g.list.length === 1 ? `/invoices/${g.list[0].id}` : '/invoices'
                  return (
                    <Link key={i} href={href} className={`mk${g.late ? ' late' : ''}${i === 0 ? ' first' : ''}`}
                      style={{ left: `${g.x}%`, width: size, height: size, ['--i' as string]: i }}
                      aria-label={`${who}, ${money(total, sym)}, ${g.late ? 'late' : `due ${when}`}`}>
                      <span className={`mk-l ${i % 2 ? 'down' : 'up'}${edge}${i > 2 ? ' extra' : ''}`}>
                        {who} · {money(total, sym)}<small>{when}</small>
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
        {otherCurrency && <p className="hf-sub" style={{ color: 'var(--t2)', marginTop: 10 }}>Totals are in {sym}; invoices in other currencies are listed but not added up.</p>}

        <div className="cols">
          <section className="panel" aria-labelledby="needs-h">
            <div className="panel-head">
              <h2 id="needs-h">Needs you</h2>
              <Link href="/invoices" className="panel-link">All invoices</Link>
            </div>
            {needs.length === 0 ? (
              <p className="quiet">You’re all caught up. <Link href="/new-invoice">Start a new invoice</Link></p>
            ) : needs.map(inv => {
              const cur = inv.currency || sym
              const info = { status: inv.status, due_date: inv.due_date, reminders_sent: sentCount[inv.id] ?? 0 }
              const act = inv.status === 'draft' ? 'Send it' : inv.status === 'overdue' ? 'Remind' : 'Open'
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="item">
                  <StatusMark mark={describeStatus(info).mark} />
                  <div style={{ minWidth: 0 }}>
                    <div className="item-name">{inv.client_name || '—'}</div>
                    <div className="item-sub"><InvoiceStatus {...info} /> · {inv.invoice_number}</div>
                  </div>
                  <div>
                    <div className="item-amt"><span className="cur">{cur}</span>{num(Number(inv.total || 0))}</div>
                    <span className="item-act">{act}</span>
                  </div>
                </Link>
              )
            })}
          </section>

          <section className="panel" aria-labelledby="soon-h">
            <div className="panel-head">
              <h2 id="soon-h">Coming up</h2>
              <Link href="/reminders" className="panel-link">Reminders</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="quiet">No reminders booked. StagePay can follow up for you from the <Link href="/reminders">Reminders</Link> page.</p>
            ) : upcoming.map((r, i) => {
              const inv = byId.get(r.invoice_id)!
              return (
                <Link key={i} href={`/invoices/${inv.id}`} className="when">
                  <span className="when-date">{dayLabel(ymd(new Date(r.send_at)))}</span>
                  <span className="when-what">{r.channel === 'email' ? 'Email' : 'WhatsApp'} reminder to <b>{inv.client_name}</b></span>
                </Link>
              )
            })}
          </section>
        </div>

        <RevealOnView className="panel months" aria-labelledby="months-h">
          <div className="panel-head">
            <h2 id="months-h">Last 6 months</h2>
          </div>
          <p className="months-sum">
            {sixTotal > 0
              ? <><b>{money(sixTotal, sym)}</b> invoiced since {months[0].name}, <b>{paidShare(sixPaid, sixTotal)}</b> of it paid. Busiest month: {best.name}, <b>{money(best.invoiced, sym)}</b>.</>
              : <>No invoices issued since {months[0].name}.</>}
          </p>
          <div className="chart" role="list">
            {series.map((m, i) => {
              const h = (m.invoiced / maxMonth) * 100
              const p = m.invoiced ? (m.paid / m.invoiced) * 100 : 0
              const isNow = i === series.length - 1
              return (
                <div key={m.key} className={`col${isNow ? ' now' : ''}`} role="listitem">
                  <div className="bar" tabIndex={0} style={{ height: `${Math.max(h, 1.5)}%`, ['--i' as string]: i }}
                    aria-label={`${m.name}: ${money(m.invoiced, sym)} invoiced, ${money(m.paid, sym)} paid`}>
                    <span className="bar-v">{m.invoiced ? money(m.invoiced, sym) : '—'}</span>
                    {!isNow && m.invoiced > 0 && <span className="bar-tip">{m.count} {m.count === 1 ? 'invoice' : 'invoices'} · {money(m.paid, sym)} paid</span>}
                    {p > 0 && <span className={`paid${p >= 99.5 ? ' full' : ''}`} style={{ height: `${p}%` }} />}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mlabels" aria-hidden="true">
            {series.map((m, i) => <span key={m.key} className={i === series.length - 1 ? 'now' : ''}>{m.name}</span>)}
          </div>
          <div className="legend" aria-hidden="true">
            <span><i className="paid" />Paid</span>
            <span><i className="unpaid" />Not paid yet</span>
          </div>
        </RevealOnView>

        <section className="panel period" aria-labelledby="period-h">
          <div className="panel-head">
            <h2 id="period-h">Invoiced {PERIOD_WORDS[period]}</h2>
            <PeriodSelect value={period} />
          </div>
          {inPeriod.length === 0 ? (
            <p className="quiet">No invoices issued {PERIOD_WORDS[period]}.</p>
          ) : (
            <>
              <p className="period-sum"><b>{money(invoiced, sym)}</b> invoiced across {inPeriod.length} {inPeriod.length === 1 ? 'invoice' : 'invoices'}, <b>{money(paid, sym)}</b> of it paid.</p>
              {recent.map(inv => {
                const cur = inv.currency || sym
                const info = { status: inv.status, due_date: inv.due_date, reminders_sent: sentCount[inv.id] ?? 0 }
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="item">
                    <StatusMark mark={describeStatus(info).mark} />
                    <div style={{ minWidth: 0 }}>
                      <div className="item-name">{inv.client_name || '—'}</div>
                      <div className="item-sub">{inv.invoice_number}{inv.project ? ` · ${inv.project}` : ''}</div>
                    </div>
                    <div>
                      <div className="item-amt"><span className="cur">{cur}</span>{num(Number(inv.total || 0))}</div>
                      <span className="item-act"><InvoiceStatus {...info} /></span>
                    </div>
                  </Link>
                )
              })}
            </>
          )}
        </section>
      </div>
    </>
  )
}
