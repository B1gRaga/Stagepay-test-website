'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { waLink } from '@/lib/wa-link'
import { STATUS_CSS } from './InvoiceStatus'

export type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  vat_number: string | null
  notes: string | null
  created_at: string
}

// Per client, in the currency of their latest invoice. Drafts are not "billed";
// sent, pending and overdue invoices are what they owe.
export type ClientStats = {
  currency: string
  invoices: number
  billed: number
  owes: number
  late: number
  lateCount: number
  lastIssued: string | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}
// The same stable hue the New invoice screen gives each person.
function hue(name: string) {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
function money(n: number, sym: string) {
  return `${sym}${Math.round(n).toLocaleString('en')}`
}
function shortDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  const thisYear = new Date().getFullYear()
  return `${day} ${MONTHS[m - 1]}${y !== thisYear ? ` ${y}` : ''}`
}

const EMPTY: ClientStats = { currency: 'P', invoices: 0, billed: 0, owes: 0, late: 0, lateCount: 0, lastIssued: null }

const CSS = `
${STATUS_CSS}
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .btn-new{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:8px;background:var(--g);color:#1F2A44;font-size:14px;font-weight:700;text-decoration:none;}
  .btn-new:hover{background:#FFB81C;}
  .content{padding:24px 28px 48px;max-width:1180px;}
  .finding{font-size:15px;color:var(--t1);margin-bottom:18px;}
  .finding b{font-variant-numeric:tabular-nums;}
  .finding .late{color:var(--st-late);}

  .toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
  .search{position:relative;flex:1;max-width:380px;min-width:220px;}
  .search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;}
  .search input{width:100%;height:38px;background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:0 12px 0 36px;font:500 14px var(--font-manrope),sans-serif;color:var(--t1);outline:none;transition:border-color var(--dur-1) var(--ease);}
  .search input:focus{border-color:var(--g);}
  .search input::placeholder{color:var(--t3);}
  .seg{display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:var(--bg2);border:1px solid var(--line);}
  .seg button{height:30px;padding:0 12px;border:0;border-radius:7px;background:transparent;color:var(--t2);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
  .seg button:hover{color:var(--t1);}
  .seg button[aria-pressed="true"]{background:var(--surface2);color:var(--t1);}
  html[data-theme="light"] .seg button[aria-pressed="true"]{background:var(--surface);}
  .seg .n{color:var(--t3);font-weight:500;font-variant-numeric:tabular-nums;}

  .sheet{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .grid{display:grid;grid-template-columns:36px minmax(0,1.6fr) 130px 150px 96px 176px;column-gap:16px;align-items:center;padding:0 20px;}
  .head{height:40px;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--t3);}
  .head .r,.c-owes,.c-billed{text-align:right;}
  .row{position:relative;min-height:66px;border-bottom:1px solid var(--line);transition:background-color var(--dur-1) var(--ease);animation:cl-in var(--dur-3) var(--ease) both;animation-delay:calc(var(--i,0) * 35ms);}
  .row:last-child{border-bottom:0;}
  .row:hover{background:color-mix(in srgb,var(--t1) 4%,transparent);}
  .av{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;font-size:12px;font-weight:700;background:hsl(var(--h) 70% 90%);color:hsl(var(--h) 45% 28%);}
  html:not([data-theme="light"]) .av{background:hsl(var(--h) 30% 30%);color:hsl(var(--h) 70% 85%);}
  .c-who{min-width:0;padding:12px 0;}
  .name{display:block;font-size:14px;font-weight:600;color:var(--t1);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .name::after{content:"";position:absolute;inset:0;}
  .name:hover{text-decoration:underline;text-decoration-color:var(--t3);text-underline-offset:3px;}
  .contact{display:block;font-size:13px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;}
  .c-owes{font-size:15px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;white-space:nowrap;}
  .c-owes small,.c-billed small{display:block;font-size:12px;font-weight:500;color:var(--t2);}
  .c-owes.late{color:var(--st-late);}
  .c-owes.late small{color:inherit;opacity:.85;}
  .c-owes.clear{font-weight:500;color:var(--t2);font-size:13px;}
  .c-billed{font-size:14px;color:var(--t1);font-variant-numeric:tabular-nums;white-space:nowrap;}
  .c-last{font-size:13px;color:var(--t2);white-space:nowrap;}
  .c-act{position:relative;z-index:1;display:flex;gap:6px;justify-content:flex-end;}
  .act{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--line2);background:var(--bg2);color:var(--t1);font:600 13px var(--font-manrope),sans-serif;text-decoration:none;white-space:nowrap;}
  .act:hover{border-color:var(--t3);}
  .act.wa{width:34px;padding:0;color:#1DA851;}
  html:not([data-theme="light"]) .act.wa{color:#3DDC84;}
  .act[aria-disabled="true"]{opacity:.35;pointer-events:none;}
  .name:focus-visible,.act:focus-visible,.seg button:focus-visible,.btn-new:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:6px;}

  .empty{padding:56px 24px;text-align:center;}
  .empty h2{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px;}
  .empty p{font-size:14px;color:var(--t2);max-width:360px;margin:0 auto 18px;}
  @keyframes cl-in{from{opacity:0;transform:translateY(6px)}}
  @media (prefers-reduced-motion: reduce){.row{animation:none;}}

  @media(max-width:1000px){
    .grid{grid-template-columns:36px minmax(0,1fr) 120px 140px 176px;}
    .c-last,.head .h-last{display:none;}
  }
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .btn-new{display:none;}
    .content{padding:16px 16px 32px;}
    .toolbar{flex-direction:column;align-items:stretch;}
    .search{max-width:none;}
    .seg{display:flex;}
    .seg button{flex:1;justify-content:center;}
    .head{display:none;}
    .grid{grid-template-columns:36px minmax(0,1fr) auto;grid-template-areas:"av who owes" "av act act";row-gap:10px;column-gap:12px;padding:14px 16px;}
    .row{min-height:0;}
    .av{grid-area:av;align-self:start;}
    .c-who{grid-area:who;padding:0;}
    .c-owes{grid-area:owes;}
    .c-billed{display:none;}
    .c-act{grid-area:act;justify-content:flex-start;}
    .act{height:36px;}
    .act.new{flex:1;}
  }
`

export default function ClientsGrid({
  clients,
  stats,
  currency,
}: {
  clients: Client[]
  stats: Record<string, ClientStats>
  currency: string
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'owes'>('all')

  // Who owes the most (late first) at the top, then whoever you billed most recently.
  const sorted = useMemo(() => [...clients].sort((a, b) => {
    const sa = stats[a.id] ?? EMPTY, sb = stats[b.id] ?? EMPTY
    return (sb.late - sa.late) || (sb.owes - sa.owes) || (sb.lastIssued ?? '').localeCompare(sa.lastIssued ?? '') || a.name.localeCompare(b.name)
  }), [clients, stats])

  const owing = sorted.filter(c => (stats[c.id]?.owes ?? 0) > 0)

  const shown = useMemo(() => {
    let list = filter === 'owes' ? owing : sorted
    if (search.trim()) {
      const q = search.toLowerCase()
      const digits = q.replace(/\D/g, '')
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (digits.length > 2 && c.phone?.replace(/\D/g, '').includes(digits))
      )
    }
    return list
  }, [sorted, owing, filter, search])

  // The summary only adds up money in the account's main currency.
  const owedHere = owing.filter(c => stats[c.id].currency === currency)
  const owedSum = owedHere.reduce((s, c) => s + stats[c.id].owes, 0)
  const lateSum = owedHere.reduce((s, c) => s + stats[c.id].late, 0)

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-title">Clients</h1>
        <Link href="/new-invoice" className="btn-new press">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          New invoice
        </Link>
      </div>

      <div className="content">
        {clients.length > 0 && (
          <p className="finding">
            {owing.length === 0
              ? <>All {clients.length} clients are paid up.</>
              : <>
                  {owing.length === 1 ? '1' : owing.length} of your {clients.length} clients {owing.length === 1 ? 'owes' : 'owe'} you <b>{money(owedSum, currency)}</b>
                  {lateSum > 0 ? <>, and <b className="late">{money(lateSum, currency)}</b> of it is late.</> : '.'}
                </>}
          </p>
        )}

        <div className="toolbar">
          <label className="search">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
            <input type="search" aria-label="Search clients" placeholder="Search name, number or email" value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <div className="seg" role="group" aria-label="Show">
            <button type="button" className="press" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All <span className="n">{clients.length}</span></button>
            <button type="button" className="press" aria-pressed={filter === 'owes'} onClick={() => setFilter('owes')}>Owe you <span className="n">{owing.length}</span></button>
          </div>
        </div>

        <div className="sheet">
          {shown.length > 0 && (
            <div className="grid head" aria-hidden="true">
              <span />
              <span>Client</span>
              <span className="r">Owes you</span>
              <span className="r">Billed</span>
              <span className="h-last">Last invoice</span>
              <span />
            </div>
          )}

          {shown.length === 0 ? (
            <div className="empty">
              <h2>{search.trim() ? 'No matches' : filter === 'owes' ? 'Nobody owes you anything' : 'No clients yet'}</h2>
              <p>{search.trim() ? `No client matches “${search.trim()}”.` : filter === 'owes' ? 'Every sent invoice has been paid.' : 'A client is added the first time you send them an invoice.'}</p>
              {!search.trim() && filter === 'all' && <Link href="/new-invoice" className="btn-new press">New invoice</Link>}
            </div>
          ) : shown.map((c, i) => {
            const s = stats[c.id] ?? { ...EMPTY, currency }
            const contact = [c.phone, c.email].filter(Boolean).join(' · ')
            return (
              <div key={c.id} className="grid row" style={{ ['--i' as string]: Math.min(i, 12) }}>
                <span className="av" style={{ ['--h' as string]: hue(c.name) }} aria-hidden="true">{initials(c.name)}</span>
                <div className="c-who">
                  <Link href={`/invoices?q=${encodeURIComponent(c.name)}`} className="name">{c.name}</Link>
                  <span className="contact">{contact || 'No contact details'}</span>
                </div>
                {s.owes > 0 ? (
                  <span className={`c-owes${s.late > 0 ? ' late' : ''}`}>
                    {money(s.owes, s.currency)}
                    <small>{s.late > 0 ? `${s.lateCount === 1 ? '1 invoice' : `${s.lateCount} invoices`} late` : 'not due yet'}</small>
                  </span>
                ) : (
                  <span className="c-owes clear">{s.invoices ? 'Paid up' : '—'}</span>
                )}
                <span className="c-billed">
                  {s.billed > 0 ? money(s.billed, s.currency) : '—'}
                  <small>{s.invoices === 1 ? '1 invoice' : `${s.invoices} invoices`}</small>
                </span>
                <span className="c-last">{shortDate(s.lastIssued)}</span>
                <span className="c-act">
                  {c.phone ? (
                    <a className="act wa press" href={waLink(c.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.name}`} title={`WhatsApp ${c.name}`}>
                      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z"/></svg>
                    </a>
                  ) : (
                    <span className="act wa" aria-disabled="true" title="No WhatsApp number">
                      <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z"/></svg>
                    </span>
                  )}
                  <Link className="act new press" href={`/new-invoice?client=${c.id}`}>New invoice</Link>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
