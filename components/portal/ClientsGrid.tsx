'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
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

const UNDO_MS = 6000

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
  .grid{display:grid;grid-template-columns:36px minmax(0,1.6fr) 130px 150px 96px 216px;column-gap:16px;align-items:center;padding:0 20px;}
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

  .act.del{width:34px;padding:0;color:var(--t2);}
  .act.del:hover{color:#DC2626;border-color:color-mix(in srgb,#DC2626 45%,transparent);}

  .dlg{margin:auto;border:0;padding:0;border-radius:16px;background:var(--bg2);color:var(--t1);width:min(420px,calc(100vw - 32px));box-shadow:0 24px 64px rgba(0,0,0,.35);}
  .dlg::backdrop{background:rgba(15,20,35,.55);}
  .dlg[open]{animation:dlg-in var(--dur-2) var(--ease) both;}
  .dlg-body{padding:24px 24px 20px;}
  .dlg h2{font-size:18px;font-weight:800;letter-spacing:-.01em;}
  .dlg p{font-size:14px;color:var(--t2);line-height:1.55;margin-top:8px;}
  .dlg p b{color:var(--t1);}
  .dlg-acts{display:flex;justify-content:flex-end;gap:8px;padding:0 24px 20px;}
  .dlg-acts button{height:38px;padding:0 16px;border-radius:8px;font:700 14px var(--font-manrope),sans-serif;cursor:pointer;border:1px solid var(--line2);background:transparent;color:var(--t1);}
  .dlg-acts .danger{background:#DC2626;border-color:#DC2626;color:#FFFFFF;}
  .dlg-acts .danger:hover{background:#B91C1C;}
  .dlg-acts button:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  @keyframes dlg-in{from{opacity:0;transform:translateY(8px) scale(.98)}}

  .toast{position:fixed;left:50%;bottom:24px;z-index:1300;transform:translateX(-50%);display:flex;align-items:center;gap:14px;min-width:300px;max-width:calc(100vw - 32px);padding:12px 12px 12px 16px;border-radius:12px;background:#111827;color:#FAF7F0;font-size:14px;box-shadow:0 12px 32px rgba(0,0,0,.3);overflow:hidden;animation:toast-in var(--dur-2) var(--ease) both;}
  .toast .msg{flex:1;}
  .toast button{height:32px;padding:0 12px;border-radius:8px;border:0;background:rgba(250,247,240,.12);color:#FAF7F0;font:700 13px var(--font-manrope),sans-serif;cursor:pointer;}
  .toast button:hover{background:rgba(250,247,240,.2);}
  .toast .timer{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--g);transform-origin:left;animation:toast-timer ${UNDO_MS}ms linear both;}
  @media(max-width:768px){.toast{bottom:calc(72px + env(safe-area-inset-bottom,0px));}}
  @keyframes toast-in{from{opacity:0;transform:translate(-50%,10px)}}
  @keyframes toast-timer{to{transform:scaleX(0)}}
  @media (prefers-reduced-motion: reduce){.dlg[open],.toast{animation:none;}.toast .timer{animation:none;opacity:0;}}

  .empty{padding:56px 24px;text-align:center;}
  .empty h2{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px;}
  .empty p{font-size:14px;color:var(--t2);max-width:360px;margin:0 auto 18px;}
  @keyframes cl-in{from{opacity:0;transform:translateY(6px)}}
  @media (prefers-reduced-motion: reduce){.row{animation:none;}}

  @media(max-width:1000px){
    .grid{grid-template-columns:36px minmax(0,1fr) 120px 140px 216px;}
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
  role = 'owner',
}: {
  clients: Client[]
  stats: Record<string, ClientStats>
  currency: string
  role?: 'owner' | 'admin' | 'staff'
}) {
  const [search, setSearch] = useState('')
  const canDelete = role === 'owner' || role === 'admin'

  // Deleting: confirm in a dialog, remove the row at once, offer Undo for a
  // few seconds. Invoices are kept either way.
  const [gone, setGone] = useState<Set<string>>(() => new Set())
  const [asking, setAsking] = useState<Client | null>(null)
  const [toast, setToast] = useState<{ msg: string; undo?: Client } | null>(null)
  const dlgRef = useRef<HTMLDialogElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const d = dlgRef.current
    if (!d) return
    if (asking && !d.open) d.showModal()
    if (!asking && d.open) d.close()
  }, [asking])

  function showToast(t: { msg: string; undo?: Client }) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = setTimeout(() => setToast(null), UNDO_MS)
  }

  async function confirmDelete() {
    const c = asking
    if (!c) return
    setAsking(null)
    setGone(g => new Set(g).add(c.id))
    try {
      const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      showToast({ msg: `${c.name} deleted`, undo: c })
    } catch {
      setGone(g => { const n = new Set(g); n.delete(c.id); return n })
      showToast({ msg: `Couldn’t delete ${c.name}. Try again.` })
    }
  }

  async function undoDelete(c: Client) {
    setToast(null)
    setGone(g => { const n = new Set(g); n.delete(c.id); return n })
    try {
      const res = await fetch(`/api/clients/${c.id}/restore`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error()
    } catch {
      setGone(g => new Set(g).add(c.id))
      showToast({ msg: `Couldn’t bring back ${c.name}.` })
    }
  }
  const [filter, setFilter] = useState<'all' | 'owes'>('all')

  // Who owes the most (late first) at the top, then whoever you billed most recently.
  const sorted = useMemo(() => clients.filter(c => !gone.has(c.id)).sort((a, b) => {
    const sa = stats[a.id] ?? EMPTY, sb = stats[b.id] ?? EMPTY
    return (sb.late - sa.late) || (sb.owes - sa.owes) || (sb.lastIssued ?? '').localeCompare(sa.lastIssued ?? '') || a.name.localeCompare(b.name)
  }), [clients, stats, gone])

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
        {sorted.length > 0 && (
          <p className="finding">
            {owing.length === 0
              ? <>{sorted.length === 1 ? 'Your client is' : `All ${sorted.length} clients are`} paid up.</>
              : <>
                  {owing.length === 1 ? '1' : owing.length} of your {sorted.length} clients {owing.length === 1 ? 'owes' : 'owe'} you <b>{money(owedSum, currency)}</b>
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
            <button type="button" className="press" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All <span className="n">{sorted.length}</span></button>
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
                  {canDelete && (
                    <button type="button" className="act del press" onClick={() => setAsking(c)} aria-label={`Delete ${c.name}`} title={`Delete ${c.name}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.6 6.5v4.5M9.4 6.5v4.5"/></svg>
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <dialog ref={dlgRef} className="dlg" aria-labelledby="del-h" onClose={() => setAsking(null)}>
        {asking && (() => {
          const s = stats[asking.id] ?? { ...EMPTY, currency }
          return (
            <>
              <div className="dlg-body">
                <h2 id="del-h">Delete {asking.name}?</h2>
                <p>They’ll be removed from your clients. Their invoices stay, so your history and totals don’t change.</p>
                {s.owes > 0 && <p>They still owe <b>{money(s.owes, s.currency)}</b>. Those invoices and their reminders carry on.</p>}
              </div>
              <div className="dlg-acts">
                <button type="button" onClick={() => setAsking(null)} autoFocus>Cancel</button>
                <button type="button" className="danger" onClick={confirmDelete}>Delete client</button>
              </div>
            </>
          )
        })()}
      </dialog>

      {toast && (
        <div className="toast" role="status">
          <span className="msg">{toast.msg}</span>
          {toast.undo && <button type="button" onClick={() => undoDelete(toast.undo!)}>Undo</button>}
          {toast.undo && <span className="timer" aria-hidden="true" />}
        </div>
      )}
    </>
  )
}
