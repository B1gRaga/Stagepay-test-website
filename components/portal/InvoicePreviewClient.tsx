'use client'
import { addTransitionType, startTransition, useEffect, useRef, useState, ViewTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { openWhatsApp, publicInvoiceUrl, markInvoiceSent } from '@/lib/wa-link'
import { useSharablePdf, sharePdf } from '@/lib/wa-share'
import { InvoiceStatus, StatusMark, STATUS_CSS } from './InvoiceStatus'
import { FROM_LIST_KEY } from './InvoicesTable'

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
  public_token?: string | null
  email_sent_at?: string | null
}

export type InvoiceReminder = {
  status: string
  send_at: string
  sent_at: string | null
  channel: string
}

const UNDO_MS = 5000

const CSS = `
${STATUS_CSS}
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;padding:0 28px;background:var(--bg2);}
  .back-link{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px 0 6px;margin-left:-6px;border-radius:8px;color:var(--t2);text-decoration:none;font-size:14px;font-weight:600;}
  .back-link:hover{color:var(--t1);background:color-mix(in srgb,var(--t1) 5%,transparent);}
  .top-num{font-size:14px;color:var(--t3);font-variant-numeric:tabular-nums;}
  .content{padding:28px 28px 48px;max-width:980px;margin:0 auto;}
  @media(max-width:768px){.topbar{padding:0 16px;}.content{padding:20px 16px 40px;}}

  .head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px 32px;flex-wrap:wrap;margin-bottom:24px;}
  .head-sub{font-size:14px;color:var(--t2);margin-bottom:6px;}
  .head h1{font-size:24px;font-weight:700;letter-spacing:-.01em;color:var(--t1);line-height:1.2;}
  .amount{font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1.1;color:var(--t1);font-variant-numeric:tabular-nums;margin-top:10px;}
  .amount .cur{color:var(--t2);font-weight:600;margin-right:2px;}
  .head-meta{font-size:14px;color:var(--t2);margin-top:8px;}
  .head-status .st{font-size:15px;gap:9px;}
  @media(max-width:600px){.amount{font-size:34px;}.head{align-items:flex-start;}}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:9px;font:700 14px var(--font-manrope),sans-serif;cursor:pointer;text-decoration:none;border:1px solid var(--line2);background:transparent;color:var(--t1);white-space:nowrap;}
  .btn:hover:not(:disabled){border-color:var(--t3);}
  .btn:disabled{opacity:.55;cursor:default;}
  .btn:focus-visible,.icon-btn:focus-visible,.back-link:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  .btn.primary{background:var(--g);border-color:var(--g);color:#1F2A44;}
  .btn.primary:hover:not(:disabled){background:#FFB81C;border-color:#FFB81C;}
  .btn[aria-expanded="true"]{background:color-mix(in srgb,var(--t1) 7%,transparent);}
  .btn.primary[aria-expanded="true"]{background:#FFB81C;}

  .actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
  .actions .spacer{flex:1;}
  .tools{display:inline-flex;align-items:center;gap:2px;flex-wrap:wrap;}
  .icon-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:8px;border:0;background:transparent;color:var(--t2);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;text-decoration:none;}
  .icon-btn:hover{color:var(--t1);background:color-mix(in srgb,var(--t1) 5%,transparent);}
  .icon-btn.danger:hover{color:#E5484D;background:color-mix(in srgb,#E5484D 10%,transparent);}
  @media(max-width:600px){
    .actions .btn{flex:1 1 calc(50% - 4px);}
    .actions .btn.primary{flex-basis:100%;}
    .actions .spacer{display:none;}
    .tools{display:flex;width:100%;justify-content:space-between;}
  }

  .panel{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:16px;animation:rise-in var(--dur-2) var(--ease) both;}
  .panel label{display:block;font-size:13px;font-weight:600;color:var(--t2);margin-bottom:8px;}
  .panel-row{display:flex;gap:8px;flex-wrap:wrap;}
  .panel-input{flex:1;min-width:200px;max-width:340px;height:40px;background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:0 12px;font:600 14px var(--font-manrope),sans-serif;color:var(--t1);outline:none;transition:border-color var(--dur-1) var(--ease);}
  .panel-input:focus{border-color:var(--g);}
  .panel-note{font-size:14px;color:var(--t2);margin:0 0 10px;}
  .panel-note b{color:var(--t1);}
  .panel-err{color:#E5484D;font-size:13px;margin-top:8px;}
  .panel-ok{color:var(--t1);font-size:13px;margin-top:8px;font-weight:600;}

  /* Timeline: where this invoice is, in the order it happens. */
  .tl{list-style:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:20px;}
  .tl-step{position:relative;padding-right:12px;min-width:0;}
  .tl-mark{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
  .tl-mark .track{flex:1;height:2px;border-radius:2px;background:var(--line2);}
  .tl-step.done .track{background:var(--t3);}
  .tl-step:last-child .track{display:none;}
  .tl-title{font-size:14px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tl-step.todo .tl-title{color:var(--t2);font-weight:500;}
  .tl-step.late .tl-title{color:var(--st-late);}
  .tl-when{font-size:13px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  @media(max-width:600px){
    .tl{grid-template-columns:1fr;row-gap:0;padding:14px 16px;}
    .tl-step{display:grid;grid-template-columns:18px 1fr;column-gap:12px;padding:0 0 14px;}
    .tl-step:last-child{padding-bottom:0;}
    .tl-mark{grid-row:1 / span 2;flex-direction:column;align-items:center;margin:0;gap:4px;height:100%;}
    .tl-mark .track{width:2px;height:auto;flex:1;}
  }

  .preview{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
  .preview iframe{width:100%;height:80vh;border:none;display:block;background:#fff;}
  .no-preview{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px 20px;font-size:14px;color:var(--t2);}

  .toast{position:fixed;left:50%;bottom:24px;z-index:1300;transform:translateX(-50%);display:flex;align-items:center;gap:14px;min-width:300px;max-width:calc(100vw - 32px);padding:12px 12px 12px 16px;border-radius:12px;background:#111827;color:#FAF7F0;font-size:14px;box-shadow:0 12px 32px rgba(0,0,0,.3);overflow:hidden;animation:toast-in var(--dur-2) var(--ease) both;}
  .toast .msg{flex:1;}
  .toast button{height:32px;padding:0 12px;border-radius:8px;border:0;background:rgba(250,247,240,.12);color:#FAF7F0;font:700 13px var(--font-manrope),sans-serif;cursor:pointer;}
  .toast button:hover{background:rgba(250,247,240,.2);}
  .toast .timer{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--g);transform-origin:left;animation:toast-timer ${UNDO_MS}ms linear both;}
  @media(max-width:768px){.toast{bottom:calc(72px + env(safe-area-inset-bottom,0px));}}
  @keyframes toast-in{from{opacity:0;transform:translate(-50%,10px)}}
  @keyframes toast-timer{to{transform:scaleX(0)}}

  .modal-backdrop{position:fixed;inset:0;background:rgba(10,14,24,.55);z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fade-in var(--dur-2) var(--ease) both;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:380px;padding:22px 22px 18px;box-shadow:0 24px 64px rgba(0,0,0,.35);animation:rise-in var(--dur-2) var(--ease) both;}
  .modal h2{font-size:16px;font-weight:700;color:var(--t1);}
  .modal p{font-size:14px;color:var(--t2);margin-top:6px;}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
  .btn.danger{background:#E5484D;border-color:#E5484D;color:#fff;}
  @keyframes fade-in{from{opacity:0}}
  @keyframes rise-in{from{opacity:0;transform:translateY(8px)}}
  @media (prefers-reduced-motion: reduce){
    .panel,.toast,.modal,.modal-backdrop{animation:none;}
    .toast .timer{animation:none;display:none;}
  }
`

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`
}

function shortDate(d: string) {
  return fmtDate(d).split(' ').slice(0, 2).join(' ')
}

type Step = { key: string; title: string; when?: string; state: 'done' | 'todo' | 'late'; mark: 'draft' | 'sent' | 'reminded' | 'late' | 'paid' | 'cancelled' }

// Only what StagePay records: created, sent (dated for email; WhatsApp sends go
// through wa.me and can't be timed), reminders sent or booked, and paid / due.
function timeline(inv: PreviewInvoice, reminders: InvoiceReminder[], createdBy?: string | null): Step[] {
  const sentAt = inv.email_sent_at ?? undefined
  const via = sentAt ? ' by email' : ''
  const isSent = !['draft', 'cancelled'].includes(inv.status) || !!sentAt
  const done = reminders.filter(r => r.status === 'sent')
  const next = reminders.find(r => r.status === 'scheduled')
  const times = done.length === 1 ? 'once' : done.length === 2 ? 'twice' : `${done.length} times`

  const steps: Step[] = [
    { key: 'created', title: createdBy ? `Created by ${createdBy}` : 'Created', when: fmtDate(inv.issue_date), state: 'done', mark: 'sent' },
    isSent
      ? { key: 'sent', title: `Sent${via}`, when: sentAt ? fmtDate(sentAt) : undefined, state: 'done', mark: 'sent' }
      : { key: 'sent', title: 'Not sent yet', when: 'Send it on WhatsApp', state: 'todo', mark: 'draft' },
    done.length
      ? { key: 'reminded', title: `Reminded ${times}`, when: next ? `Next ${shortDate(next.send_at)}` : `Last ${fmtDate(done[done.length - 1].sent_at ?? done[done.length - 1].send_at)}`, state: 'done', mark: 'reminded' }
      : { key: 'reminded', title: next ? 'Reminder booked' : 'No reminders', when: next ? fmtDate(next.send_at) : undefined, state: 'todo', mark: 'draft' },
  ]
  if (inv.status === 'paid') steps.push({ key: 'paid', title: 'Paid', state: 'done', mark: 'paid' })
  else if (inv.status === 'cancelled') steps.push({ key: 'paid', title: 'Cancelled', state: 'todo', mark: 'cancelled' })
  else if (inv.status === 'overdue') steps.push({ key: 'paid', title: 'Not paid', when: inv.due_date ? `Was due ${fmtDate(inv.due_date)}` : undefined, state: 'late', mark: 'late' })
  else steps.push({ key: 'paid', title: 'Not paid yet', when: inv.due_date ? `Due ${fmtDate(inv.due_date)}` : undefined, state: 'todo', mark: 'draft' })
  return steps
}

export default function InvoicePreviewClient({ invoice: initial, reminders = [], createdBy = null }: { invoice: PreviewInvoice; reminders?: InvoiceReminder[]; createdBy?: string | null }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState(initial)
  const [panel, setPanel] = useState<'email' | 'whatsapp' | null>(null)
  const [sendEmail, setSendEmail] = useState(initial.client_email || '')
  const [sendPhone, setSendPhone] = useState(initial.client_phone || '')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const [sendOk, setSendOk] = useState(false)
  const [toast, setToast] = useState<{ msg: string; undo: boolean } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Browsers without a built-in PDF viewer (Android Chrome, in-editor browsers) download a
  // framed PDF instead of showing it, so they get an "Open the PDF" card. Unknown until mounted.
  const [pdfInline, setPdfInline] = useState<boolean | null>(null)
  useEffect(() => { setPdfInline(navigator.pdfViewerEnabled !== false) }, [])

  // A "mark as paid" waits UNDO_MS before it is saved, because paid can't be reversed on the server.
  const pendingPaid = useRef<{ timer: ReturnType<typeof setTimeout>; prev: string } | null>(null)

  const sym = invoice.currency || 'P'

  function openPanel(which: 'email' | 'whatsapp') {
    setSendErr(''); setSendOk(false); setPdfShared(false)
    setPanel(prev => prev === which ? null : which)
  }

  // Once an invoice is paid, Email/WhatsApp forward a paid receipt instead of the original invoice.
  const paidMode = invoice.status === 'paid'

  // On phones the PDF itself is shared through the share menu; linkOnly after a failed share.
  const [linkOnly, setLinkOnly] = useState(false)
  const [pdfShared, setPdfShared] = useState(false)
  const pdf = useSharablePdf(
    panel === 'whatsapp' && !linkOnly ? `/api/invoices/${invoice.id}/pdf${paidMode ? '?paid=true' : ''}` : null,
    `${invoice.invoice_number}.pdf`,
  )
  const sharing = !!pdf.file || pdf.preparing

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
    setSendErr(''); setSendOk(false)
    const amount = `${sym}${Number(invoice.total).toLocaleString('en', { minimumFractionDigits: 2 })}`
    const link = publicInvoiceUrl(invoice.public_token)
    const paidText = `Hi ${invoice.client_name} 👋\n\nGreat news — your payment for invoice *${invoice.invoice_number}* of *${amount}* has been received and confirmed. ✅\n\nThank you for your prompt payment. We appreciate your business!`
    const intro = `Here is invoice *${invoice.invoice_number}* for *${amount}*${invoice.due_date ? `, due ${invoice.due_date}` : ''}.`
    const recordSend = () => {
      setSendOk(true)
      if (invoice.status === 'draft') {
        setInvoice(prev => ({ ...prev, status: 'sent' }))
        markInvoiceSent(invoice.id)
      }
    }

    // Step 2 after a PDF share: WhatsApp drops text that comes with a shared
    // file, so the message goes to their chat by wa.me and lands under the PDF.
    if (pdfShared) {
      if (sendPhone.replace(/\D/g, '').length < 7) {
        setSendErr('Enter the number with country code, e.g. +267 71 234 567')
        return
      }
      openWhatsApp(sendPhone, paidMode ? paidText : [`Hi ${invoice.client_name} 👋`, ``, `The PDF above is invoice *${invoice.invoice_number}* for *${amount}*${invoice.due_date ? `, due ${invoice.due_date}` : ''}.`, link ? `\nView it online: ${link}` : '', ``, `Thank you for your business!`].join('\n'))
      setPdfShared(false)
      setSendOk(true)
      return
    }

    // Phone: share the PDF itself. The share must start before any await.
    if (pdf.file) {
      const text = paidMode ? paidText : [`Hi ${invoice.client_name} 👋`, ``, intro, link ? `\nView it online: ${link}` : '', ``, `Thank you for your business!`].join('\n')
      const result = await sharePdf(pdf.file, text)
      if (result === 'shared') { recordSend(); setSendOk(false); setPdfShared(true) }
      else if (result === 'failed') {
        setLinkOnly(true)
        setSendErr('The share menu didn’t open. Tap the button again to send a link instead.')
      }
      return
    }

    if (sendPhone.replace(/\D/g, '').length < 7) {
      setSendErr('Enter the number with country code, e.g. +267 71 234 567')
      return
    }
    openWhatsApp(sendPhone, paidMode ? paidText : [
      `Hi ${invoice.client_name} 👋`,
      ``,
      intro,
      link ? `\nView and download it here:\n${link}` : '',
      ``,
      `Thank you for your business!`,
    ].join('\n'))
    recordSend()
  }

  function savePaid(keepalive = false) {
    const p = pendingPaid.current
    if (!p) return
    clearTimeout(p.timer)
    pendingPaid.current = null
    fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH', credentials: 'include', keepalive,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    }).then(res => {
      if (!res.ok) throw new Error()
      setToast(t => (t?.undo ? null : t))
    }).catch(() => {
      setInvoice(prev => ({ ...prev, status: p.prev }))
      setToast({ msg: 'Couldn’t mark it as paid. Try again.', undo: false })
    })
  }

  function markAsPaid() {
    if (pendingPaid.current) return
    const prev = invoice.status
    setInvoice(i => ({ ...i, status: 'paid' }))
    setPanel(null)
    setToast({ msg: `${invoice.invoice_number} marked as paid.`, undo: true })
    pendingPaid.current = { prev, timer: setTimeout(() => savePaid(), UNDO_MS) }
  }

  function undoPaid() {
    const p = pendingPaid.current
    if (!p) return
    clearTimeout(p.timer)
    pendingPaid.current = null
    setInvoice(i => ({ ...i, status: p.prev }))
    setToast(null)
  }

  // Leaving the page (in-app or closing the tab) saves a pending "paid" straight away.
  useEffect(() => {
    const flush = () => savePaid(true)
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast || toast.undo) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Back to the list through history when we came from it and nothing changed here:
  // the cached list shows instantly, so the name and amount morph back into their row.
  // After a status change, a normal navigation fetches the list fresh instead.
  function goBack(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    let fromList = false
    try { fromList = sessionStorage.getItem(FROM_LIST_KEY) === invoice.id } catch {}
    if (!fromList || invoice.status !== initial.status || pendingPaid.current) return
    e.preventDefault()
    try { sessionStorage.removeItem(FROM_LIST_KEY) } catch {}
    startTransition(() => {
      addTransitionType('nav-back')
      router.back()
    })
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

  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'overdue'
  const steps = timeline(invoice, reminders, createdBy)
  const reminderCount = reminders.filter(r => r.status === 'sent').length

  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
    <div>
      <style>{CSS}</style>

      <div className="topbar">
        <Link href="/invoices" className="back-link press" transitionTypes={['nav-back']} onClick={goBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
          Invoices
        </Link>
        <span className="top-num">{invoice.invoice_number}</span>
      </div>

      <div className="content">
        <div className="head">
          <div>
            <div className="head-sub">{invoice.invoice_number}{invoice.project ? ` · ${invoice.project}` : ''}</div>
            <ViewTransition name={`inv-client-${invoice.id}`} share="inv-shared">
              <h1>{invoice.client_name}</h1>
            </ViewTransition>
            <ViewTransition name={`inv-amt-${invoice.id}`} share="inv-shared">
              <div className="amount"><span className="cur">{sym}</span>{fmt(Number(invoice.total || 0), '')}</div>
            </ViewTransition>
            <div className="head-meta">Issued {fmtDate(invoice.issue_date)}{invoice.due_date ? ` · Due ${fmtDate(invoice.due_date)}` : ''}</div>
          </div>
          <div className="head-status" aria-live="polite">
            <InvoiceStatus status={invoice.status} due_date={invoice.due_date} reminders_sent={reminderCount} size={20} />
          </div>
        </div>

        <div className="actions">
          <button type="button" className="btn primary press" onClick={() => openPanel('whatsapp')} aria-expanded={panel === 'whatsapp'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z"/></svg>
            {paidMode ? 'Send receipt on WhatsApp' : 'Send on WhatsApp'}
          </button>
          <button type="button" className="btn press" onClick={() => openPanel('email')} aria-expanded={panel === 'email'}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/></svg>
            Email
          </button>
          {canMarkPaid && (
            <button type="button" className="btn press" onClick={markAsPaid}>
              <StatusMark mark="paid" size={16} />
              Mark as paid
            </button>
          )}
          <span className="spacer" />
          <span className="tools">
            <a className="icon-btn press" href={`/api/invoices/${invoice.id}/pdf`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13.5h12"/></svg>
              PDF
            </a>
            <a className="icon-btn press" href={`/api/invoices/${invoice.id}/pdf?view=true`} target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4z"/></svg>
              Print
            </a>
            <Link className="icon-btn press" href={`/new-invoice?edit=${invoice.id}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
              Edit
            </Link>
            <button type="button" className="icon-btn danger press" onClick={() => setDeleteOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.8 9.5h7.4l.8-9.5"/></svg>
              Delete
            </button>
          </span>
        </div>

        {panel === 'whatsapp' && (
          <div className="panel">
            {pdfShared ? (
              <>
                <p className="panel-note">PDF shared. Now send the message, so it shows under the PDF in <b>{invoice.client_name}</b>’s chat.</p>
                <div className="panel-row">
                  <input id="wa-to" className="panel-input" type="tel" aria-label="Their WhatsApp number" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" />
                  <button type="button" className="btn primary press" onClick={sendWhatsAppNow} disabled={!sendPhone}>Send the message</button>
                </div>
              </>
            ) : sharing ? (
              <>
                <p className="panel-note">Your phone’s share menu opens with the {paidMode ? 'paid receipt' : 'invoice'} PDF. Choose <b>WhatsApp</b>, then <b>{invoice.client_name}</b>{sendPhone ? <> ({sendPhone})</> : null}.</p>
                <div className="panel-row">
                  <button type="button" className="btn primary press" onClick={sendWhatsAppNow} disabled={pdf.preparing}>{pdf.preparing ? 'Preparing PDF…' : 'Share PDF'}</button>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="wa-to">{paidMode ? 'Send paid confirmation to WhatsApp number' : 'Send to WhatsApp number'}</label>
                <div className="panel-row">
                  <input id="wa-to" className="panel-input" type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" autoFocus />
                  <button type="button" className="btn primary press" onClick={sendWhatsAppNow} disabled={!sendPhone}>Open in WhatsApp</button>
                </div>
              </>
            )}
            {sendErr && <div className="panel-err">{sendErr}</div>}
            {sendOk && <div className="panel-ok">WhatsApp opened. Tap send there to deliver it.</div>}
          </div>
        )}
        {panel === 'email' && (
          <div className="panel">
            <label htmlFor="em-to">{paidMode ? 'Send paid confirmation to email' : 'Send to email'}</label>
            <div className="panel-row">
              <input id="em-to" className="panel-input" type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@example.com" autoFocus />
              <button type="button" className="btn primary press" onClick={sendEmailNow} disabled={sending || !sendEmail}>{sending ? 'Sending…' : 'Send email'}</button>
            </div>
            {sendErr && <div className="panel-err">{sendErr}</div>}
            {sendOk && <div className="panel-ok">Sent.</div>}
          </div>
        )}

        <ol className="tl" aria-label="Invoice timeline">
          {steps.map(s => (
            <li key={s.key} className={`tl-step ${s.state}`}>
              <div className="tl-mark"><StatusMark mark={s.mark} /><span className="track" /></div>
              <div>
                <div className="tl-title">{s.title}</div>
                {s.when && <div className="tl-when">{s.when}</div>}
              </div>
            </li>
          ))}
        </ol>

        <div className="preview">
          {pdfInline === true && (
            <iframe src={`/api/invoices/${invoice.id}/pdf?view=true`} title={`Invoice ${invoice.invoice_number}`} />
          )}
          {pdfInline === false && (
            <div className="no-preview">
              <p>This browser can’t show the invoice here.</p>
              <a className="btn press" href={`/api/invoices/${invoice.id}/pdf?view=true`} target="_blank" rel="noreferrer">Open the PDF</a>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          <span className="msg">{toast.msg}</span>
          {toast.undo && <button type="button" onClick={undoPaid}>Undo</button>}
          {toast.undo && <span className="timer" aria-hidden="true" />}
        </div>
      )}

      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteOpen(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title" onClick={e => e.stopPropagation()}>
            <h2 id="del-title">Delete {invoice.invoice_number}?</h2>
            <p>It will be removed for good, along with its reminders.</p>
            <div className="modal-actions">
              <button type="button" className="btn press" onClick={() => setDeleteOpen(false)} autoFocus>Keep it</button>
              <button type="button" className="btn danger press" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ViewTransition>
  )
}
