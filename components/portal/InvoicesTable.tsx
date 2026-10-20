'use client'
import { useState, useMemo, ViewTransition } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { InvoiceStatus, StatusMark, describeStatus, STATUS_CSS } from './InvoiceStatus'

export type Invoice = {
  id: string
  invoice_number: string
  client_name: string
  client_email?: string | null
  client_phone?: string | null
  project: string | null
  issue_date: string | null
  due_date?: string | null
  total: number
  status: string
  currency: string
  reminders_sent?: number
}

// Set when a row is opened, so the invoice page's back link can return through history
// (instant, from the router cache) and the shared name and amount morph back into their row.
export const FROM_LIST_KEY = 'sp-inv-from-list'

const FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'draft',   label: 'Drafts' },
  { id: 'sent',    label: 'Sent' },
  { id: 'overdue', label: 'Late' },
  { id: 'paid',    label: 'Paid' },
] as const

function matches(filter: string, status: string) {
  if (filter === 'all') return true
  if (filter === 'sent') return status === 'sent' || status === 'pending'
  return status === filter
}

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`
}

// One line at the top that says what needs doing, most urgent first, with the filter that shows it.
function finding(list: Invoice[]): { text: string; filter?: string } | null {
  const late = list.filter(i => i.status === 'overdue')
  const drafts = list.filter(i => i.status === 'draft')
  const waiting = list.filter(i => i.status === 'sent' || i.status === 'pending')
  const sum = (xs: Invoice[]) => {
    const cur = new Set(xs.map(i => i.currency || 'P'))
    return cur.size === 1 ? fmt(xs.reduce((s, i) => s + Number(i.total || 0), 0), [...cur][0]) : null
  }
  if (late.length) {
    const s = sum(late)
    return { text: `${late.length === 1 ? '1 invoice is' : `${late.length} invoices are`} late${s ? `: ${s} overdue` : ''}.`, filter: 'overdue' }
  }
  if (drafts.length) return { text: `${drafts.length === 1 ? '1 draft hasn’t' : `${drafts.length} drafts haven’t`} been sent yet.`, filter: 'draft' }
  if (waiting.length) {
    const s = sum(waiting)
    return { text: s ? `${s} waiting on clients.` : `${waiting.length} invoices waiting on clients.`, filter: 'sent' }
  }
  return list.length ? { text: 'Everything is paid up.' } : null
}

const CSS = `
${STATUS_CSS}
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-h1{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .btn-new{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:8px;background:var(--g);color:#1F2A44;font-size:14px;font-weight:700;text-decoration:none;}
  .btn-new:hover{background:#FFB81C;}
  .btn-new:focus-visible,.seg button:focus-visible,.row-link:focus-visible,.row-del:focus-visible,.more-btn:focus-visible{outline:2px solid var(--g);outline-offset:2px;}

  .content{padding:24px 28px 40px;}
  .finding{font-size:15px;color:var(--t1);margin-bottom:18px;min-height:20px;}
  .finding-link{margin-left:10px;border:0;background:none;padding:0;color:var(--t1);font:700 15px var(--font-manrope),sans-serif;text-decoration:underline;text-decoration-color:var(--g);text-decoration-thickness:2px;text-underline-offset:4px;cursor:pointer;}
  .finding-link:hover{text-decoration-color:var(--t1);}
  .finding-link:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:2px;}

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
  .seg .n{font-variant-numeric:tabular-nums;color:var(--t3);font-weight:500;}

  .sheet{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .grid{display:grid;grid-template-columns:22px minmax(0,1.6fr) 150px 108px minmax(0,1fr) 112px 36px;column-gap:16px;align-items:center;padding:0 16px 0 20px;}
  .head{height:40px;border-bottom:1px solid var(--line);font-size:12px;font-weight:500;color:var(--t3);}
  .head .r,.c-amt{text-align:right;}

  .row{position:relative;min-height:62px;border-bottom:1px solid var(--line);transition:background-color var(--dur-1) var(--ease);}
  .row:last-child{border-bottom:0;}
  .row:hover{background:color-mix(in srgb,var(--t1) 4%,transparent);}
  .row:has(.row-link:active){background:color-mix(in srgb,var(--t1) 7%,transparent);}
  .c-client{min-width:0;padding:11px 0;}
  .row-link{display:block;color:var(--t1);text-decoration:none;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;outline:none;}
  .row-link::after{content:"";position:absolute;inset:0;}
  .row:has(.row-link:focus-visible){box-shadow:inset 0 0 0 2px var(--g);}
  .sub{display:block;font-size:13px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sub-mob{display:none;}
  .c-num,.c-date{font-size:13px;color:var(--t2);white-space:nowrap;font-variant-numeric:tabular-nums;}
  .c-amt{font-size:15px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;white-space:nowrap;}
  .c-amt .cur{color:var(--t2);font-weight:600;margin-right:1px;}
  .c-label{min-width:0;overflow:hidden;}
  .c-label .st-mark{display:none;}
  .c-mark{display:flex;align-items:center;}

  .row-del{position:relative;z-index:1;width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--t3);cursor:pointer;opacity:0;}
  .row:hover .row-del,.row-del:focus-visible{opacity:1;}
  .row-del:hover{color:#E5484D;background:color-mix(in srgb,#E5484D 12%,transparent);}
  @media (hover:none){.row-del{opacity:1;}}

  /* The clicked row says it is opening while the invoice loads. */
  .row-pending{position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--g);transform-origin:left;transform:scaleX(0);opacity:0;pointer-events:none;}
  .row-pending[data-on="true"]{opacity:1;animation:row-load 1.2s var(--ease) forwards;}
  @keyframes row-load{from{transform:scaleX(.08)}to{transform:scaleX(.85)}}

  .empty{padding:56px 24px;text-align:center;}
  .empty h2{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px;}
  .empty p{font-size:14px;color:var(--t2);max-width:340px;margin:0 auto 18px;}

  .more{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--line);font-size:13px;color:var(--t2);}
  .more-btn{height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:8px;}
  .more-btn:hover:not(:disabled){border-color:var(--t3);}
  .more-btn:disabled{opacity:.6;cursor:default;}
  @keyframes spin{to{transform:rotate(360deg)}}

  .modal-backdrop{position:fixed;inset:0;background:rgba(10,14,24,.55);z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fade-in var(--dur-2) var(--ease) both;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:380px;padding:22px 22px 18px;box-shadow:0 24px 64px rgba(0,0,0,.35);animation:rise-in var(--dur-2) var(--ease) both;}
  .modal h2{font-size:16px;font-weight:700;color:var(--t1);}
  .modal p{font-size:14px;color:var(--t2);margin-top:6px;}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
  .m-btn{height:38px;padding:0 16px;border-radius:8px;font:700 14px var(--font-manrope),sans-serif;cursor:pointer;border:1px solid var(--line2);background:transparent;color:var(--t1);}
  .m-btn.danger{background:#E5484D;border-color:#E5484D;color:#fff;}
  .m-btn:disabled{opacity:.6;cursor:default;}
  @keyframes fade-in{from{opacity:0}}
  @keyframes rise-in{from{opacity:0;transform:translateY(8px) scale(.98)}}
  @media (prefers-reduced-motion: reduce){
    .modal-backdrop,.modal{animation:none;}
    .row-pending[data-on="true"]{animation:none;transform:scaleX(.5);}
  }

  @media(max-width:900px){
    .grid{grid-template-columns:22px minmax(0,1fr) 140px 108px 36px;}
    .c-num,.head .h-num,.c-date,.head .h-date{display:none;}
  }
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .content{padding:16px 16px 32px;}
    .btn-new{display:none;}
    .toolbar{flex-direction:column;align-items:stretch;}
    .search{max-width:none;}
    .seg{display:flex;}
    .seg button{flex:1;justify-content:center;padding:0 6px;}
    .seg .n{display:none;}
    .head{display:none;}
    .grid{grid-template-columns:22px minmax(0,1fr) auto;grid-template-areas:"mark client amt" "mark client label";column-gap:12px;row-gap:2px;padding:12px 16px;}
    .row{min-height:0;}
    .c-mark{grid-area:mark;align-self:start;padding-top:2px;}
    .c-client{grid-area:client;padding:0;}
    .c-amt{grid-area:amt;}
    .c-label{grid-area:label;justify-self:end;}
    .c-label .st{font-size:12px;}
    .row-del{display:none;}
    .sub-desk{display:none;}
    .sub-mob{display:block;}
  }
`

const EMPTY: Record<string, { title: string; sub: string; cta: boolean }> = {
  all:       { title: 'No invoices yet',        sub: 'Send your first invoice and it will show up here.', cta: true },
  draft:     { title: 'No drafts',              sub: 'Invoices you save without sending wait here.',      cta: true },
  sent:      { title: 'Nothing waiting',        sub: 'Invoices you’ve sent and not been paid for show here.', cta: false },
  overdue:   { title: 'Nothing is late',        sub: 'Every sent invoice is paid or still within its due date.', cta: false },
  paid:      { title: 'No paid invoices yet',   sub: 'When you mark an invoice as paid it moves here.',  cta: false },
}

function PendingBar() {
  const { pending } = useLinkStatus()
  return <span className="row-pending" data-on={pending} aria-hidden="true" />
}

export default function InvoicesTable({ initialInvoices, totalCount, initialSearch = '' }: { initialInvoices: Invoice[], totalCount: number, initialSearch?: string }) {
  const [invoices, setInvoices]   = useState<Invoice[]>(initialInvoices)
  const [filter, setFilter]       = useState<string>('all')
  const [search, setSearch]       = useState(initialSearch)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [nextPage, setNextPage]   = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [serverTotal, setServerTotal] = useState(totalCount)

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/invoices?page=${nextPage}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.invoices?.length) {
        const mapped: Invoice[] = data.invoices.map((inv: any) => ({
          id: inv.id, invoice_number: inv.invoice_number, client_name: inv.client_name,
          client_email: inv.client_email, client_phone: inv.client_phone, project: inv.project,
          issue_date: inv.issue_date, due_date: inv.due_date, total: inv.total, status: inv.status, currency: inv.currency,
        }))
        setInvoices(prev => [...prev, ...mapped])
        setNextPage(p => p + 1)
        if (data.total != null) setServerTotal(data.total)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const allLoaded = invoices.length >= serverTotal
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.id, invoices.filter(i => matches(f.id, i.status)).length])), [invoices])

  const filtered = useMemo(() => {
    let list = invoices.filter(i => matches(filter, i.status))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.client_name?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q) ||
        i.project?.toLowerCase().includes(q)
      )
    }
    return list
  }, [invoices, filter, search])

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${deleteId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) setInvoices(prev => prev.filter(i => i.id !== deleteId))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const empty = EMPTY[filter] || EMPTY.all
  const headline = finding(invoices)

  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
    <div>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-h1">Invoices</h1>
        <Link href="/new-invoice" className="btn-new press">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          New invoice
        </Link>
      </div>

      <div className="content">
        {headline && (
          <p className="finding">
            {headline.text}
            {headline.filter && filter !== headline.filter && (
              <button type="button" className="finding-link" onClick={() => setFilter(headline.filter!)}>Show them</button>
            )}
          </p>
        )}

        <div className="toolbar">
          <label className="search">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
            <input
              type="search"
              aria-label="Search invoices"
              placeholder="Search client, number or project"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <div className="seg" role="group" aria-label="Filter by status">
            {FILTERS.map(f => (
              <button key={f.id} type="button" className="press" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}{allLoaded && <span className="n">{counts[f.id]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet">
          <div className="grid head" aria-hidden="true">
            <span />
            <span>Client</span>
            <span className="h-num">Number</span>
            <span className="h-date">Issued</span>
            <span>Status</span>
            <span className="r">Amount</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <h2>{search.trim() ? 'No matches' : empty.title}</h2>
              <p>{search.trim() ? `Nothing matches “${search.trim()}”.` : empty.sub}</p>
              {empty.cta && !search.trim() && <Link href="/new-invoice" className="btn-new press">New invoice</Link>}
            </div>
          ) : (
            filtered.map(inv => {
              const sym = inv.currency || 'P'
              const { mark } = describeStatus(inv)
              return (
                <div key={inv.id} className="grid row">
                  <span className="c-mark"><StatusMark mark={mark} /></span>
                  <div className="c-client">
                    <Link href={`/invoices/${inv.id}`} className="row-link" transitionTypes={['nav-forward']}
                      onClick={() => { try { sessionStorage.setItem(FROM_LIST_KEY, inv.id) } catch {} }}>
                      <ViewTransition name={`inv-client-${inv.id}`} share="inv-shared">
                        <span>{inv.client_name || '—'}</span>
                      </ViewTransition>
                      <PendingBar />
                    </Link>
                    <span className="sub sub-desk">{inv.project || '—'}</span>
                    <span className="sub sub-mob">{inv.invoice_number}{inv.project ? ` · ${inv.project}` : ''}</span>
                  </div>
                  <span className="c-num">{inv.invoice_number || '—'}</span>
                  <span className="c-date">{fmtDate(inv.issue_date)}</span>
                  <span className="c-label"><InvoiceStatus {...inv} /></span>
                  <ViewTransition name={`inv-amt-${inv.id}`} share="inv-shared">
                    <span className="c-amt"><span className="cur">{sym}</span>{fmt(Number(inv.total || 0), '')}</span>
                  </ViewTransition>
                  <button type="button" className="row-del press" onClick={() => setDeleteId(inv.id)} aria-label={`Delete ${inv.invoice_number}`} title="Delete">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.8 9.5h7.4l.8-9.5"/></svg>
                  </button>
                </div>
              )
            })
          )}

          {!allLoaded && (
            <div className="more">
              <span>Showing {invoices.length} of {serverTotal}</span>
              <button type="button" className="more-btn press" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--line2)', borderTopColor: 'var(--g)', animation: 'spin .7s linear infinite' }} />}
                {loadingMore ? 'Loading' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteId(null)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={e => e.stopPropagation()}>
            <h2 id="del-title">Delete {invoices.find(i => i.id === deleteId)?.invoice_number ?? 'this invoice'}?</h2>
            <p>It will be removed for good, along with its reminders.</p>
            <div className="modal-actions">
              <button type="button" className="m-btn press" onClick={() => setDeleteId(null)} autoFocus>Keep it</button>
              <button type="button" className="m-btn danger press" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ViewTransition>
  )
}
