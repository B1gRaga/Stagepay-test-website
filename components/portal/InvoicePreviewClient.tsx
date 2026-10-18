'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type PreviewInvoice = {
  id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  project: string | null
  issue_date: string | null
  due_date: string | null
  total: number
  status: string
  currency: string
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

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .back-link{display:flex;align-items:center;gap:8px;color:var(--t2);text-decoration:none;font-size:13px;font-weight:600;}
  .back-link:hover{color:var(--t1);}
  .content{padding:24px 28px;max-width:960px;margin:0 auto;}
  @media(max-width:768px){.topbar{padding:0 16px;}.content{padding:16px;}}

  .pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}
  .pill-paid{background:rgba(242,169,0,.12);color:#C98C00;border:1px solid rgba(242,169,0,.25);}
  .pill-pending{background:rgba(245,158,11,.1);color:#fbbf24;border:1px solid rgba(245,158,11,.22);}
  .pill-sent{background:rgba(59,130,246,.12);color:#60a5fa;border:1px solid rgba(59,130,246,.22);}
  .pill-overdue{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.22);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(250,247,240,.45);border:1px solid rgba(100,116,139,.2);}
  .pill-cancelled{background:rgba(100,116,139,.12);color:rgba(250,247,240,.45);border:1px solid rgba(100,116,139,.2);}

  .summary{display:flex;align-items:center;justify-content:space-between;background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:20px 24px;margin-bottom:20px;flex-wrap:wrap;gap:14px;}
  .summary-num{font-size:13px;color:var(--t3);margin-bottom:4px;}
  .summary-amt{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:32px;letter-spacing:1px;color:var(--t1);}
  .summary-meta{font-size:12px;color:var(--t3);margin-top:4px;}

  .actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
  .act-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);background:var(--bg2);color:var(--t2);letter-spacing:.03em;font-family:var(--font-archivo),sans-serif;text-decoration:none;}
  .act-btn:hover{border-color:var(--g);color:var(--g);}
  .act-btn:disabled{opacity:.5;cursor:not-allowed;}
  .act-btn.primary{background:var(--g);color:#1F2A44;border-color:var(--g);}
  .act-btn.primary:hover{background:#C98C00;color:#1F2A44;}
  .act-btn.danger{color:var(--danger);border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.06);}
  .act-btn.danger:hover{background:rgba(239,68,68,.12);color:var(--danger);}

  .panel{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:20px;}
  .panel-label{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t3);margin-bottom:6px;}
  .panel-input{width:100%;max-width:360px;background:var(--surface);border:1px solid var(--line2);border-radius:6px;padding:9px 12px;font-family:var(--font-archivo),sans-serif;font-weight:700;font-size:13px;color:var(--t1);outline:none;}
  .panel-input:focus{border-color:rgba(242,169,0,.4);}
  .panel-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;}
  .panel-err{color:var(--danger);font-size:12px;margin-top:8px;}
  .panel-ok{color:var(--g);font-size:12px;margin-top:8px;font-weight:600;}

  .preview-frame-wrap{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .preview-frame{width:100%;height:80vh;border:none;display:block;background:#fff;}

  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.4);}
  .modal-header{padding:20px 24px 16px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .modal-title{font-size:15px;font-weight:600;color:var(--t1);}
  .modal-sub{font-size:12px;color:var(--t3);margin-top:2px;}
  .modal-close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;color:var(--t3);cursor:pointer;flex-shrink:0;}
  .modal-close:hover{background:var(--surface);color:var(--t1);}
  .modal-footer{padding:16px 24px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;}
  .modal-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-archivo),sans-serif;}
  .modal-btn-secondary{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .modal-btn-secondary:hover{border-color:var(--t2);}
  .modal-btn:disabled{opacity:.5;cursor:not-allowed;}
`

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[parseInt(m) - 1]} ${y}`
}

export default function InvoicePreviewClient({ invoice: initial }: { invoice: PreviewInvoice }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState(initial)
  const [panel, setPanel] = useState<'email' | 'whatsapp' | null>(null)
  const [sendEmail, setSendEmail] = useState(initial.client_email || '')
  const [sendPhone, setSendPhone] = useState(initial.client_phone || '')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const [sendOk, setSendOk] = useState(false)
  const [marking, setMarking] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sym = invoice.currency || 'P'

  function openPanel(which: 'email' | 'whatsapp') {
    setSendErr(''); setSendOk(false)
    setPanel(prev => prev === which ? null : which)
  }

  // Once an invoice is paid, Email/WhatsApp forward a paid receipt instead of the original invoice.
  const paidMode = invoice.status === 'paid'

  async function sendEmailNow() {
    setSending(true); setSendErr(''); setSendOk(false)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id, to_email: sendEmail, paid_stamp: paidMode }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to send email')
      setSendOk(true)
      if (invoice.status === 'draft') setInvoice(prev => ({ ...prev, status: 'sent' }))
    } catch (e: any) {
      setSendErr(e.message)
    } finally {
      setSending(false)
    }
  }

  async function sendWhatsAppNow() {
    setSending(true); setSendErr(''); setSendOk(false)
    try {
      const sym = invoice.currency || 'P'
      const amount = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
      const paidBody = `Hi ${invoice.client_name} 👋\n\nGreat news — your payment for invoice *${invoice.invoice_number}* of *${amount}* has been received and confirmed. ✅\n\nThank you for your prompt payment. We appreciate your business!`
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          to_phone: sendPhone,
          invoice_number: invoice.invoice_number,
          client_name: invoice.client_name,
          total_amount: invoice.total,
          currency: invoice.currency,
          due_date: invoice.due_date,
          ...(paidMode ? { custom_body: paidBody } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to send WhatsApp message')
      setSendOk(true)
      if (invoice.status === 'draft') setInvoice(prev => ({ ...prev, status: 'sent' }))
    } catch (e: any) {
      setSendErr(e.message)
    } finally {
      setSending(false)
    }
  }

  async function markAsPaid() {
    setMarking(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (res.ok) setInvoice(prev => ({ ...prev, status: 'paid' }))
    } finally {
      setMarking(false)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) router.push('/invoices')
      else setDeleting(false)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <Link href="/invoices" className="back-link">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L4 8l6 5"/></svg>
          Invoices
        </Link>
        <div className="page-title">{invoice.invoice_number || 'INVOICE'}</div>
        <div style={{ width: 70 }} />
      </div>

      <div className="content">
        <div className="summary">
          <div>
            <div className="summary-num">{invoice.client_name}{invoice.project ? ` · ${invoice.project}` : ''}</div>
            <div className="summary-amt">{fmt(Number(invoice.total || 0), sym)}</div>
            <div className="summary-meta">Issued {fmtDate(invoice.issue_date)}{invoice.due_date ? ` · Due ${fmtDate(invoice.due_date)}` : ''}</div>
          </div>
          <span className={`pill pill-${invoice.status}`} style={{ fontSize: 12, padding: '6px 14px' }}>{invoice.status}</span>
        </div>

        <div className="actions">
          <button className="act-btn primary" onClick={() => openPanel('email')}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/></svg>
            Email
          </button>
          <button className="act-btn primary" onClick={() => openPanel('whatsapp')}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z"/></svg>
            WhatsApp
          </button>
          <a className="act-btn" href={`/api/invoices/${invoice.id}/pdf`}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13h12"/></svg>
            Download PDF
          </a>
          <a className="act-btn" href={`/api/invoices/${invoice.id}/pdf?view=true`} target="_blank" rel="noreferrer">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4z"/></svg>
            Print
          </a>
          <Link className="act-btn" href={`/new-invoice?edit=${invoice.id}`}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
            Edit
          </Link>
          {(invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'overdue') && (
            <button className="act-btn" onClick={markAsPaid} disabled={marking}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
              {marking ? 'Marking…' : 'Mark as Paid'}
            </button>
          )}
          <button className="act-btn danger" onClick={() => setDeleteOpen(true)} style={{ marginLeft: 'auto' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/></svg>
            Delete
          </button>
        </div>

        {panel === 'email' && (
          <div className="panel">
            <div className="panel-label">{paidMode ? 'Send paid confirmation to email' : 'Send to email'}</div>
            <input className="panel-input" type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@example.com" />
            <div className="panel-row">
              <button className="act-btn primary" onClick={sendEmailNow} disabled={sending || !sendEmail}>{sending ? 'Sending…' : 'Send email'}</button>
            </div>
            {sendErr && <div className="panel-err">{sendErr}</div>}
            {sendOk && <div className="panel-ok">Sent.</div>}
          </div>
        )}
        {panel === 'whatsapp' && (
          <div className="panel">
            <div className="panel-label">{paidMode ? 'Send paid confirmation to WhatsApp number' : 'Send to WhatsApp number'}</div>
            <input className="panel-input" type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" />
            <div className="panel-row">
              <button className="act-btn primary" onClick={sendWhatsAppNow} disabled={sending || !sendPhone}>{sending ? 'Sending…' : 'Send WhatsApp'}</button>
            </div>
            {sendErr && <div className="panel-err">{sendErr}</div>}
            {sendOk && <div className="panel-ok">Sent.</div>}
          </div>
        )}

        <div className="preview-frame-wrap">
          <iframe className="preview-frame" src={`/api/invoices/${invoice.id}/pdf?view=true`} title="Invoice preview" />
        </div>
      </div>

      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Delete invoice?</div>
                <div className="modal-sub">This cannot be undone.</div>
              </div>
              <button className="modal-close" onClick={() => setDeleteOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l12 12M14 2L2 14"/></svg>
              </button>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-secondary" onClick={() => setDeleteOpen(false)}>Cancel</button>
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
