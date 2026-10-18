'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type Invoice = {
  id: string
  invoice_number: string
  client_name: string
  client_email?: string | null
  client_phone?: string | null
  project: string | null
  issue_date: string | null
  total: number
  status: string
  currency: string
}

const FILTERS = ['all', 'paid', 'sent', 'pending', 'overdue', 'draft'] as const

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(m)-1]} ${y}`
}

const CSS = `
:root{
    --g:#F2A900;--g2:#C98C00;--g-dim:rgba(242,169,0,0.1);
    --bg:#18213A;--bg2:#1F2A44;--surface:#1F2A44;--surface2:#2B3756;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#FAF7F0;--t2:rgba(250,247,240,0.6);--t3:rgba(250,247,240,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  html[data-theme="light"]{
    --bg:#FAF7F0;--bg2:#ffffff;--surface:#F1ECE1;--surface2:#E4DDCF;
    --line:rgba(31,42,68,.08);--line2:rgba(31,42,68,.14);
    --t1:#1F2A44;--t2:rgba(31,42,68,.65);--t3:rgba(31,42,68,.45);
    --g-dim:rgba(242,169,0,.12);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:var(--font-archivo),sans-serif;background:var(--bg);color:var(--t1);}
  @keyframes spin{to{transform:rotate(360deg)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-archivo),sans-serif;text-decoration:none;}
  .btn-primary{background:var(--g);color:#1F2A44;box-shadow:0 0 14px rgba(242,169,0,.4),0 2px 8px rgba(242,169,0,.2);}
  .btn-primary:hover{background:#C98C00;transform:translateY(-1px);box-shadow:0 0 24px rgba(242,169,0,.6),0 4px 16px rgba(242,169,0,.3);}
  .btn-outline{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .btn-outline:hover{border-color:var(--g);color:var(--g);}

  .content{padding:24px 28px;}

  .filter-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
  .search-wrap{position:relative;flex:1;min-width:200px;}
  .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;}
  .search-input{
    width:100%;background:var(--bg2);border:1px solid var(--line2);border-radius:6px;
    padding:9px 14px 9px 34px;font-family:var(--font-archivo),sans-serif;font-weight:700;font-size:13px;
    color:var(--t1);outline:none;transition:border-color .15s;
  }
  .search-input:focus{border-color:rgba(242,169,0,.4);}
  .search-input::placeholder{color:var(--t3);}
  .filter-btns{display:flex;gap:6px;flex-wrap:wrap;}
  .filter-btn{
    padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;
    letter-spacing:.07em;text-transform:uppercase;cursor:pointer;
    border:1px solid var(--line2);background:var(--bg2);color:var(--t2);
    transition:all .15s;font-family:var(--font-archivo),sans-serif;
  }
  html[data-theme="light"] .filter-btn{
    background:#ffffff;border-color:rgba(31,42,68,.18);color:rgba(31,42,68,.6);
    box-shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  }
  html[data-theme="light"] .filter-btn:hover{
    background:#FAF7F0;border-color:rgba(31,42,68,.28);color:rgba(31,42,68,.8);
    box-shadow:0 2px 6px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.06);
  }
  .filter-btn:hover,.filter-btn.active{border-color:var(--g);color:var(--g);background:var(--g-dim);}
  html[data-theme="light"] .filter-btn.active{
    background:rgba(242,169,0,.1);border-color:rgba(242,169,0,.45);color:#C98C00;
    box-shadow:0 1px 4px rgba(242,169,0,.15),0 1px 2px rgba(242,169,0,.1);
  }

  .inv-table-wrap{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;transition:box-shadow .2s;}
  html[data-theme="light"] .inv-table-wrap{box-shadow:0 1px 4px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);}
  html[data-theme="light"] .inv-table-head{background:rgba(31,42,68,.03);}
  html[data-theme="light"] .load-more-bar{background:var(--bg2);}
  .inv-table-head{
    display:grid;grid-template-columns:28px 90px 1fr 140px 110px 110px 180px;
    gap:12px;padding:11px 20px;border-bottom:1px solid var(--line);background:var(--surface);
  }
  .inv-th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .inv-table-row{
    display:grid;grid-template-columns:28px 90px 1fr 140px 110px 110px 180px;
    gap:12px;padding:13px 20px;border-bottom:1px solid var(--line);
    align-items:center;transition:background .15s;
  }
  .inv-table-row:last-child{border-bottom:none;}
  .inv-table-row:hover{background:var(--surface);}
  .inv-td{font-size:13px;color:var(--t2);}
  .inv-td-num{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:15px;color:var(--t3);letter-spacing:1px;}
  .inv-td-client{font-size:13px;font-weight:600;color:var(--t1);}
  .inv-td-amount{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:17px;color:var(--t1);letter-spacing:.5px;}

  .pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}
  .pill-paid{background:rgba(242,169,0,.12);color:#C98C00;border:1px solid rgba(242,169,0,.25);}
  .pill-pending{background:rgba(245,158,11,.1);color:#fbbf24;border:1px solid rgba(245,158,11,.22);}
  .pill-sent{background:rgba(59,130,246,.12);color:#60a5fa;border:1px solid rgba(59,130,246,.22);}
  .pill-overdue{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.22);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(250,247,240,.45);border:1px solid rgba(100,116,139,.2);}
  .pill-cancelled{background:rgba(100,116,139,.12);color:rgba(250,247,240,.45);border:1px solid rgba(100,116,139,.2);}
  html[data-theme="light"] .pill-draft,html[data-theme="light"] .pill-cancelled{color:rgba(31,42,68,.5);background:rgba(100,116,139,.1);border-color:rgba(100,116,139,.25);}

  .act-btn{font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;font-weight:600;letter-spacing:.04em;font-family:var(--font-archivo),sans-serif;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:3px;}
  .act-send{background:var(--g);color:#1F2A44;}
  .act-remind{background:transparent;border:1px solid var(--warn) !important;color:var(--warn);}
  .act-chase{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3) !important;color:var(--danger);}
  .act-print{background:transparent;border:1px solid var(--line2);color:var(--t3);transition:all .12s;}
  .act-print:hover{border-color:var(--info);color:var(--info);}
  .act-forward{background:var(--g-dim);border:1px solid rgba(242,169,0,.3) !important;color:var(--g);}
  .act-forward:hover{background:rgba(242,169,0,.15);}
  .act-delete{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2) !important;color:var(--danger);transition:all .12s;}
  .act-delete:hover{background:rgba(239,68,68,.15);}
  .act-edit{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2) !important;color:var(--info);transition:all .12s;}
  .act-edit:hover{background:rgba(59,130,246,.15);}

  .empty-state{text-align:center;padding:52px 20px;}
  .empty-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:6px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:18px;max-width:320px;margin-left:auto;margin-right:auto;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:#1F2A44;border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:var(--font-archivo),sans-serif;letter-spacing:.04em;text-transform:uppercase;}

  /* Modal */
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.4);}
  .modal-header{padding:20px 24px 16px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .modal-title{font-size:15px;font-weight:600;color:var(--t1);}
  .modal-sub{font-size:12px;color:var(--t3);margin-top:2px;}
  .modal-close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;color:var(--t3);cursor:pointer;transition:all .12s;flex-shrink:0;}
  .modal-close:hover{background:var(--surface);color:var(--t1);}
  .modal-footer{padding:16px 24px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;}
  .modal-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-archivo),sans-serif;}
  .modal-btn-secondary{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .modal-btn-secondary:hover{border-color:var(--t2);}
  .modal-btn:disabled{opacity:.5;cursor:not-allowed;}

  @media(max-width:900px){
    .inv-table-head,.inv-table-row{grid-template-columns:1fr 100px 110px;}
    .inv-table-head>*:nth-child(1),.inv-table-row>*:nth-child(1),
    .inv-table-head>*:nth-child(2),.inv-table-row>*:nth-child(2),
    .inv-table-head>*:nth-child(4),.inv-table-row>*:nth-child(4),
    .inv-table-head>*:nth-child(5),.inv-table-row>*:nth-child(5){display:none;}
  }
  /* ── Mobile card list ── */
  .inv-card-list{display:none;background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}

  @media(max-width:768px){
    .topbar{padding:0 16px;}.mob-hide{display:none !important;}
    .inv-table-wrap{display:none;}
    .inv-card-list{display:block;}
  }
  @media(max-width:600px){
    .content{padding:12px 16px;}
    .filter-bar{flex-direction:column;align-items:stretch;gap:8px;}
    .search-wrap{flex:none;width:100%;}
    .filter-btns{width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px;-webkit-overflow-scrolling:touch;}
    .filter-btn{white-space:nowrap;flex-shrink:0;}
  }
  .inv-card-item{
    display:flex;align-items:center;gap:14px;
    padding:13px 16px;border-bottom:1px solid var(--line);
    cursor:pointer;transition:background .15s;
    -webkit-tap-highlight-color:transparent;
  }
  .inv-card-item:last-child{border-bottom:none;}
  .inv-card-item:active{background:var(--surface);}
  .inv-card-av{
    width:36px;height:36px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:14px;
    background:rgba(242,169,0,0.12);color:#F2A900;
    border:1px solid rgba(242,169,0,0.2);
  }
  .inv-card-info{flex:1;min-width:0;}
  .inv-card-client{font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .inv-card-meta{font-size:11px;color:var(--t3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .inv-card-amount{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:18px;letter-spacing:.5px;color:#F2A900;}

  .load-more-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--line);background:var(--surface);}
  .load-more-count{font-size:12px;color:var(--t3);}
  .load-more-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);background:transparent;color:var(--t2);font-family:var(--font-archivo),sans-serif;}
  .load-more-btn:hover:not(:disabled){border-color:var(--g);color:var(--g);}
  .load-more-btn:disabled{opacity:.5;cursor:not-allowed;}
`

const EMPTY_MSGS: Record<string, { title: string; sub: string; cta: string | null }> = {
  all:     { title: 'No invoices yet',      sub: 'Send your first invoice and your cash flow starts here.',    cta: 'New Invoice' },
  paid:    { title: 'No paid invoices',     sub: 'Your paid invoices will appear here once clients settle up.', cta: null },
  sent:    { title: 'No sent invoices yet', sub: 'Invoices you send via email or WhatsApp will appear here.', cta: 'New Invoice' },
  pending: { title: 'Nothing pending',      sub: "You're all clear — no invoices waiting for payment.",        cta: null },
  overdue: { title: 'No overdue invoices',  sub: "Great news — everything is paid up or within terms.",        cta: null },
  draft:   { title: 'No drafts saved',      sub: 'Start an invoice and save it as a draft to find it here.',  cta: 'New Invoice' },
}

export default function InvoicesTable({ initialInvoices, totalCount }: { initialInvoices: Invoice[], totalCount: number }) {
  const router = useRouter()
  const [invoices, setInvoices]   = useState<Invoice[]>(initialInvoices)
  const [filter, setFilter]       = useState<string>('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Set<string>>(new Set())
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
          issue_date: inv.issue_date, total: inv.total, status: inv.status, currency: inv.currency,
        }))
        setInvoices(prev => [...prev, ...mapped])
        setNextPage(p => p + 1)
        if (data.total != null) setServerTotal(data.total)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    let list = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
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
      if (res.ok) {
        setInvoices(prev => prev.filter(i => i.id !== deleteId))
        setSelected(prev => { const n = new Set(prev); n.delete(deleteId); return n })
      }
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(filtered.map(i => i.id)) : new Set())
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const empty = EMPTY_MSGS[filter] || EMPTY_MSGS.all

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="page-title">INVOICES</div>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary mob-hide" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            New Invoice
          </Link>
        </div>
      </div>

      <div className="content">
        <div className="filter-bar">
          <div className="search-wrap">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search by client or invoice number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-btns">
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="inv-table-wrap">
          <div className="inv-table-head">
            <div>
              <input id="it-select-all" name="select_all" type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--g)' }}
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={e => toggleAll(e.target.checked)} />
            </div>
            <div className="inv-th">Number</div>
            <div className="inv-th">Client</div>
            <div className="inv-th">Project</div>
            <div className="inv-th">Date</div>
            <div className="inv-th">Amount</div>
            <div className="inv-th">Status / Actions</div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)' }}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="#3B82F6" strokeWidth="1.8">
                  <path d="M5 4h14l4 4v16H5V4z"/><path d="M19 4v4h4"/><path d="M9 13h10M9 17h6"/>
                </svg>
              </div>
              <div className="empty-title">{empty.title}</div>
              <div className="empty-sub">{empty.sub}</div>
              {empty.cta && (
                <Link href="/new-invoice" className="empty-cta">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  {empty.cta}
                </Link>
              )}
            </div>
          ) : (
            filtered.map(inv => {
              const sym = inv.currency || 'P'
              return (
                <div key={inv.id} className="inv-table-row" style={{ color: 'inherit', cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                  <div onClick={e => e.stopPropagation()}>
                    <input id={`it-row-${inv.id}`} name={`row_${inv.id}`} type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--g)' }}
                      checked={selected.has(inv.id)} onChange={e => toggleOne(inv.id, e.target.checked)} />
                  </div>
                  <div className="inv-td-num">{inv.invoice_number || '—'}</div>
                  <div className="inv-td-client">{inv.client_name || '—'}</div>
                  <div className="inv-td">{inv.project || '—'}</div>
                  <div className="inv-td">{fmtDate(inv.issue_date)}</div>
                  <div className="inv-td-amount">{fmt(Number(inv.total || 0), sym)}</div>
                  <div className="inv-td" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className={`pill pill-${inv.status}`}>{inv.status}</span>
                    <span onClick={e => e.stopPropagation()} style={{ display:'flex', gap:4, alignItems:'center', marginLeft: 'auto' }}>
                      <button className="act-btn act-delete" onClick={() => setDeleteId(inv.id)} title="Delete invoice">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/></svg>
                      </button>
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Mobile card list (replaces table on ≤768px) ── */}
        <div className="inv-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)' }}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="#3B82F6" strokeWidth="1.8">
                  <path d="M5 4h14l4 4v16H5V4z"/><path d="M19 4v4h4"/><path d="M9 13h10M9 17h6"/>
                </svg>
              </div>
              <div className="empty-title">{EMPTY_MSGS[filter]?.title ?? 'No invoices'}</div>
              <div className="empty-sub">{EMPTY_MSGS[filter]?.sub ?? ''}</div>
              {EMPTY_MSGS[filter]?.cta && (
                <a href="/new-invoice" className="empty-cta">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  {EMPTY_MSGS[filter].cta}
                </a>
              )}
            </div>
          ) : filtered.map(inv => {
            const sym = inv.currency || 'P'
            const av = (inv.client_name || '').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??'
            return (
              <div key={inv.id} className="inv-card-item" onClick={() => router.push(`/invoices/${inv.id}`)}>
                <div className="inv-card-av">{av}</div>
                <div className="inv-card-info">
                  <div className="inv-card-client">{inv.client_name || '—'}</div>
                  <div className="inv-card-meta">{inv.invoice_number || '—'}{inv.project ? ` · ${inv.project}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="inv-card-amount">{fmt(Number(inv.total || 0), sym)}</div>
                  <div style={{ marginTop: 3 }}><span className={`pill pill-${inv.status}`}>{inv.status}</span></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Load more bar ── */}
        {invoices.length < serverTotal && (
          <div className="load-more-bar">
            <span className="load-more-count">Showing {invoices.length} of {serverTotal} invoices</span>
            <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <span style={{ width:12, height:12, borderRadius:'50%', border:'2px solid var(--line2)', borderTopColor:'var(--g)', display:'inline-block', animation:'spin .7s linear infinite' }}/>
                  Loading…
                </>
              ) : 'Load more'}
            </button>
          </div>
        )}
      </div>


      {/* Delete confirm modal */}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Delete invoice?</div>
                <div className="modal-sub">This cannot be undone.</div>
              </div>
              <button className="modal-close" onClick={() => setDeleteId(null)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l12 12M14 2L2 14"/></svg>
              </button>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="modal-btn"
                style={{ background: 'rgba(239,68,68,.15)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,.3)' }}
                onClick={confirmDelete}
                disabled={deleting}
              >{deleting ? 'Deleting…' : 'Yes, delete'}</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
