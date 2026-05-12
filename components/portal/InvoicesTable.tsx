'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

export type Invoice = {
  id: string
  invoice_number: string
  client_name: string
  client_email?: string | null
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
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@400;500;600;700&display=swap');
  :root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  html[data-theme="light"]{
    --bg:#F8FAFC;--bg2:#FFFFFF;--surface:#F1F5F9;--surface2:#E8EEF5;
    --line:rgba(15,23,42,0.08);--line2:rgba(15,23,42,0.14);
    --t1:#0F172A;--t2:rgba(15,23,42,0.65);--t3:rgba(15,23,42,0.38);
    --g-dim:rgba(16,185,129,0.08);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;}
  .btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.4),0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 0 24px rgba(16,185,129,.6),0 4px 16px rgba(16,185,129,.3);}
  .btn-outline{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .btn-outline:hover{border-color:var(--g);color:var(--g);}

  .content{padding:24px 28px;}

  .filter-bar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
  .search-wrap{position:relative;flex:1;min-width:200px;}
  .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;}
  .search-input{
    width:100%;background:var(--bg2);border:1px solid var(--line2);border-radius:6px;
    padding:9px 14px 9px 34px;font-family:'Archivo',sans-serif;font-size:13px;
    color:var(--t1);outline:none;transition:border-color .15s;
  }
  .search-input:focus{border-color:rgba(16,185,129,.4);}
  .search-input::placeholder{color:var(--t3);}
  .filter-btns{display:flex;gap:6px;flex-wrap:wrap;}
  .filter-btn{
    padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;
    letter-spacing:.07em;text-transform:uppercase;cursor:pointer;
    border:1px solid var(--line2);background:transparent;color:var(--t3);
    transition:all .15s;font-family:'Archivo',sans-serif;
  }
  .filter-btn:hover,.filter-btn.active{border-color:var(--g);color:var(--g);background:var(--g-dim);}

  .inv-table-wrap{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
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
  .inv-td-num{font-family:'Bebas Neue',sans-serif;font-size:15px;color:var(--t3);letter-spacing:1px;}
  .inv-td-client{font-size:13px;font-weight:600;color:var(--t1);}
  .inv-td-amount{font-family:'Bebas Neue',sans-serif;font-size:17px;color:var(--t1);letter-spacing:.5px;}

  .pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}
  .pill-paid{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.25);}
  .pill-pending{background:rgba(245,158,11,.1);color:#fbbf24;border:1px solid rgba(245,158,11,.22);}
  .pill-sent{background:rgba(59,130,246,.12);color:#60a5fa;border:1px solid rgba(59,130,246,.22);}
  .pill-overdue{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.22);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(248,250,252,.3);border:1px solid rgba(100,116,139,.2);}
  .pill-cancelled{background:rgba(100,116,139,.12);color:rgba(248,250,252,.3);border:1px solid rgba(100,116,139,.2);}

  .act-btn{font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;font-weight:600;letter-spacing:.04em;font-family:'Archivo',sans-serif;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:3px;}
  .act-send{background:var(--g);color:#0F172A;}
  .act-remind{background:transparent;border:1px solid var(--warn) !important;color:var(--warn);}
  .act-chase{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3) !important;color:var(--danger);}
  .act-print{background:transparent;border:1px solid var(--line2);color:var(--t3);transition:all .12s;}
  .act-print:hover{border-color:var(--info);color:var(--info);}
  .act-forward{background:var(--g-dim);border:1px solid rgba(16,185,129,.3) !important;color:var(--g);}
  .act-forward:hover{background:rgba(16,185,129,.15);}

  .empty-state{text-align:center;padding:52px 20px;}
  .empty-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:6px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:18px;max-width:320px;margin-left:auto;margin-right:auto;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:#0F172A;border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;}

  /* Modal */
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.4);}
  .modal-header{padding:20px 24px 16px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .modal-title{font-size:15px;font-weight:600;color:var(--t1);}
  .modal-sub{font-size:12px;color:var(--t3);margin-top:2px;}
  .modal-close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;color:var(--t3);cursor:pointer;transition:all .12s;flex-shrink:0;}
  .modal-close:hover{background:var(--surface);color:var(--t1);}
  .modal-body{padding:20px 24px;}
  .modal-footer{padding:16px 24px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;}
  .modal-field{margin-bottom:16px;}
  .modal-label{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t3);margin-bottom:6px;}
  .modal-input{width:100%;background:var(--surface);border:1px solid var(--line2);border-radius:6px;padding:9px 12px;font-family:'Archivo',sans-serif;font-size:13px;color:var(--t1);outline:none;transition:border-color .15s;}
  .modal-input:focus{border-color:rgba(16,185,129,.4);}
  .modal-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;}
  .modal-btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.35);}
  .modal-btn-primary:hover{background:#34d399;box-shadow:0 0 22px rgba(16,185,129,.55);}
  .modal-btn-secondary{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .modal-btn-secondary:hover{border-color:var(--t2);}
  .modal-btn:disabled{opacity:.5;cursor:not-allowed;}
  .modal-success{text-align:center;padding:24px 0 8px;}

  @media(max-width:900px){
    .inv-table-head,.inv-table-row{grid-template-columns:1fr 100px 110px;}
    .inv-table-head>*:nth-child(1),.inv-table-row>*:nth-child(1),
    .inv-table-head>*:nth-child(2),.inv-table-row>*:nth-child(2),
    .inv-table-head>*:nth-child(4),.inv-table-row>*:nth-child(4),
    .inv-table-head>*:nth-child(5),.inv-table-row>*:nth-child(5){display:none;}
  }
  @media(max-width:600px){.content{padding:16px;}.topbar{padding:0 16px;}}
`

const EMPTY_MSGS: Record<string, { title: string; sub: string; cta: string | null }> = {
  all:     { title: 'No invoices yet',      sub: 'Send your first invoice and your cash flow starts here.',    cta: 'New Invoice' },
  paid:    { title: 'No paid invoices',     sub: 'Your paid invoices will appear here once clients settle up.', cta: null },
  sent:    { title: 'No sent invoices yet', sub: 'Invoices you send via email or WhatsApp will appear here.', cta: 'New Invoice' },
  pending: { title: 'Nothing pending',      sub: "You're all clear — no invoices waiting for payment.",        cta: null },
  overdue: { title: 'No overdue invoices',  sub: "Great news — everything is paid up or within terms.",        cta: null },
  draft:   { title: 'No drafts saved',      sub: 'Start an invoice and save it as a draft to find it here.',  cta: 'New Invoice' },
}

type ForwardModalState = { inv: Invoice; email: string; sending: boolean; sent: boolean; err: string }

export default function InvoicesTable({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [filter, setFilter]     = useState<string>('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fwdModal, setFwdModal] = useState<ForwardModalState | null>(null)

  const filtered = useMemo(() => {
    let list = filter === 'all' ? initialInvoices : initialInvoices.filter(i => i.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.client_name?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q) ||
        i.project?.toLowerCase().includes(q)
      )
    }
    return list
  }, [initialInvoices, filter, search])

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

  function printInvoice(invId: string) {
    window.open(`/api/invoices/${invId}/pdf?view=true`, '_blank')
  }

  function openForwardPaid(inv: Invoice) {
    setFwdModal({ inv, email: inv.client_email || '', sending: false, sent: false, err: '' })
  }

  async function sendForwardPaid() {
    if (!fwdModal) return
    setFwdModal(p => p ? { ...p, sending: true, err: '' } : null)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: fwdModal.inv.id, to_email: fwdModal.email, paid_stamp: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setFwdModal(p => p ? { ...p, sending: false, sent: true } : null)
    } catch (e: any) {
      setFwdModal(p => p ? { ...p, sending: false, err: e.message } : null)
    }
  }

  const empty = EMPTY_MSGS[filter] || EMPTY_MSGS.all

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="page-title">INVOICES</div>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ textDecoration: 'none' }}>
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
              <input type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--g)' }}
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
                <div key={inv.id} className="inv-table-row" style={{ color: 'inherit' }}>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" style={{ cursor: 'pointer', accentColor: 'var(--g)' }}
                      checked={selected.has(inv.id)} onChange={e => toggleOne(inv.id, e.target.checked)} />
                  </div>
                  <div className="inv-td-num">{inv.invoice_number || '—'}</div>
                  <div className="inv-td-client">{inv.client_name || '—'}</div>
                  <div className="inv-td">{inv.project || '—'}</div>
                  <div className="inv-td">{fmtDate(inv.issue_date)}</div>
                  <div className="inv-td-amount">{fmt(Number(inv.total || 0), sym)}</div>
                  <div className="inv-td" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span className={`pill pill-${inv.status}`}>{inv.status}</span>
                    <span onClick={e => e.stopPropagation()} style={{ display:'flex', gap:4, alignItems:'center' }}>
                      {/* Print button */}
                      <button className="act-btn act-print" onClick={() => printInvoice(inv.id)} title="Print invoice">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4z"/></svg>
                      </button>
                      {/* Status-specific actions */}
                      {inv.status === 'draft'   && <Link href="/new-invoice" className="act-btn act-send">Send</Link>}
                      {inv.status === 'pending' && <Link href="/reminders" className="act-btn act-remind" style={{ border: '1px solid var(--warn)' }}>Remind</Link>}
                      {inv.status === 'overdue' && <Link href="/reminders" className="act-btn act-chase" style={{ border: '1px solid rgba(239,68,68,.3)' }}>Chase</Link>}
                      {inv.status === 'paid'    && (
                        <button className="act-btn act-forward" onClick={() => openForwardPaid(inv)}>
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
                          Forward
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Forward as Paid modal */}
      {fwdModal && (
        <div className="modal-backdrop" onClick={() => !fwdModal.sending && setFwdModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Forward as Paid — {fwdModal.inv.invoice_number}</div>
                <div className="modal-sub">Sends a payment confirmation with a PAID stamp to the client</div>
              </div>
              <button className="modal-close" onClick={() => setFwdModal(null)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l12 12M14 2L2 14"/></svg>
              </button>
            </div>

            <div className="modal-body">
              {fwdModal.sent ? (
                <div className="modal-success">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Confirmation sent!</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>Payment confirmation with PAID stamp emailed to {fwdModal.email}</div>
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{fwdModal.inv.client_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                        {fmt(Number(fwdModal.inv.total), fwdModal.inv.currency || 'P')} · {fwdModal.inv.invoice_number}
                      </div>
                    </div>
                    <span className="pill pill-paid" style={{ marginLeft: 'auto' }}>paid</span>
                  </div>
                  <div className="modal-field">
                    <div className="modal-label">Client email</div>
                    <input
                      className="modal-input"
                      type="email"
                      placeholder="client@example.com"
                      value={fwdModal.email}
                      onChange={e => setFwdModal(p => p ? { ...p, email: e.target.value } : null)}
                    />
                  </div>
                  {fwdModal.err && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: -8, marginBottom: 12 }}>{fwdModal.err}</div>
                  )}
                </>
              )}
            </div>

            {!fwdModal.sent && (
              <div className="modal-footer">
                <button className="modal-btn modal-btn-secondary" onClick={() => setFwdModal(null)}>Cancel</button>
                <button
                  className="modal-btn modal-btn-primary"
                  onClick={sendForwardPaid}
                  disabled={fwdModal.sending || !fwdModal.email}
                >
                  {fwdModal.sending ? 'Sending…' : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
                      Send Confirmation
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
