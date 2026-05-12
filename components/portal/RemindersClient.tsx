'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

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
}

export type Reminder = {
  id: string
  invoice_id: string
  status: string
  send_at: string
  channel: string
  sent_at: string | null
}

const ACTIVE_STATUSES = ['sent', 'overdue']

function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0
  const due  = new Date(dueDateStr)
  const now  = new Date()
  due.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - due.getTime()) / 86400000)
}

function urgencyColor(days: number) {
  if (days >= 14) return 'var(--danger)'
  if (days >= 7)  return 'var(--warn)'
  if (days >= 0)  return '#F59E0B'
  return 'var(--g)'
}

function daysLabel(days: number) {
  if (days > 0)  return `${days}d overdue`
  if (days === 0) return 'Due today'
  return `${Math.abs(days)}d left`
}

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtAmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function genEmail(inv: Invoice, firmName: string): string {
  const days = daysOverdue(inv.due_date)
  const amount = fmtAmt(inv.total, inv.currency || 'P')
  const dueLine = !inv.due_date ? '' :
    days > 0  ? `The invoice is currently ${days} day${days === 1 ? '' : 's'} overdue.` :
    days === 0 ? 'The invoice is due today.' :
                 `The invoice is due on ${inv.due_date}.`

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
                 `It is due on *${inv.due_date}*.`

  return `Hi ${inv.client_name} 👋

Just a friendly follow-up on invoice *${inv.invoice_number}* for *${amount}*${inv.project ? ` (${inv.project})` : ''}. ${dueLine}

Please let me know if you have any questions or need anything from our side.

Regards,
${firmName}`
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
  .topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;background:transparent;color:var(--t2);}
  .topbar-btn:hover{border-color:var(--g);color:var(--g);}
  .btn-primary{background:var(--g);color:#0F172A;border:none;box-shadow:0 0 14px rgba(16,185,129,.4),0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);color:#0F172A;box-shadow:0 0 24px rgba(16,185,129,.6),0 4px 16px rgba(16,185,129,.3);}

  .content{padding:24px 28px;}

  .rem-layout{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;}

  .inv-table-wrap{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:14px;}
  .inv-table-head{
    display:grid;grid-template-columns:36px 1fr 110px 100px 110px 130px;
    gap:12px;padding:11px 20px;border-bottom:1px solid var(--line);background:var(--surface);
  }
  .inv-th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .rem-row{
    display:grid;grid-template-columns:36px 1fr 110px 100px 110px 130px;
    gap:12px;padding:14px 20px;border-bottom:1px solid var(--line);
    align-items:center;transition:background .15s;cursor:pointer;
  }
  .rem-row:last-child{border-bottom:none;}
  .rem-row:hover{background:var(--surface);}
  .rem-urgency{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin:0 auto;}
  .rem-client{font-size:13px;font-weight:500;color:var(--t1);}
  .rem-inv{font-size:11px;color:var(--t3);margin-top:2px;}
  .rem-amount{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.5px;}
  .rem-toggle{
    display:flex;align-items:center;gap:5px;
    background:var(--surface);border:1px solid var(--line2);
    border-radius:5px;padding:4px 8px;cursor:pointer;
    font-size:11px;font-weight:600;color:var(--t2);
    transition:all .15s;white-space:nowrap;font-family:'Archivo',sans-serif;
  }
  .rem-toggle.active{background:var(--g-dim);border-color:rgba(16,185,129,.3);color:var(--g);}
  .rem-toggle:hover:not(.active){border-color:var(--g);color:var(--g);}
  .compose-btn{
    display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:5px;
    font-size:11px;font-weight:600;cursor:pointer;
    background:var(--g-dim);border:1px solid rgba(16,185,129,.3);color:var(--g);
    font-family:'Archivo',sans-serif;transition:all .15s;
  }
  .compose-btn:hover{background:rgba(16,185,129,.18);}

  .sched-card{background:var(--bg2);border:1px solid var(--line);border-radius:10px;overflow:hidden;position:sticky;top:0;}
  .sched-header{padding:16px 20px;border-bottom:1px solid var(--line);}
  .sched-title{font-size:13px;font-weight:600;color:var(--t1);}
  .sched-sub{font-size:11px;color:var(--t3);margin-top:3px;}
  .sched-rule{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--line);}
  .sched-rule:last-of-type{border-bottom:none;}
  .sched-rule-left{display:flex;align-items:center;gap:12px;}
  .sched-day-badge{width:40px;height:40px;border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .sched-rule-name{font-size:13px;font-weight:500;color:var(--t1);}
  .sched-rule-desc{font-size:11px;color:var(--t3);margin-top:2px;}
  .toggle-sw{width:36px;height:20px;border-radius:10px;background:var(--surface);border:1px solid var(--line2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;}
  .toggle-sw.on{background:var(--g);border-color:var(--g);}
  .toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:var(--t3);transition:transform .2s,background .2s;}
  .toggle-sw.on::after{transform:translateX(16px);background:#fff;}
  .sched-channel-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line);}
  .sched-channel-label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;color:var(--t2);}
  .wa-badge{font-size:9px;letter-spacing:.06em;text-transform:uppercase;background:rgba(37,211,102,.1);color:#25D366;border:1px solid rgba(37,211,102,.2);border-radius:3px;padding:2px 6px;font-weight:700;}

  .empty-state{text-align:center;padding:52px 20px;}
  .empty-illustration{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:6px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:18px;max-width:320px;margin-left:auto;margin-right:auto;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:#0F172A;border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;}

  /* Compose modal */
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
  .modal{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:540px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.4);max-height:90vh;display:flex;flex-direction:column;}
  .modal-header{padding:18px 22px 14px;border-bottom:1px solid var(--line);flex-shrink:0;}
  .modal-title{font-size:15px;font-weight:600;color:var(--t1);display:flex;align-items:center;justify-content:space-between;gap:10px;}
  .modal-sub{font-size:12px;color:var(--t3);margin-top:3px;}
  .modal-close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;border:none;background:transparent;color:var(--t3);cursor:pointer;transition:all .12s;flex-shrink:0;}
  .modal-close:hover{background:var(--surface);color:var(--t1);}
  .modal-tabs{display:flex;gap:2px;padding:14px 22px 0;border-bottom:1px solid var(--line);flex-shrink:0;}
  .modal-tab{padding:8px 16px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border:none;background:transparent;color:var(--t3);font-family:'Archivo',sans-serif;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
  .modal-tab.active{color:var(--g);border-bottom-color:var(--g);}
  .modal-tab:hover:not(.active){color:var(--t2);}
  .modal-body{padding:18px 22px;overflow-y:auto;flex:1;}
  .modal-footer{padding:14px 22px;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;}
  .modal-field{margin-bottom:14px;}
  .modal-label{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--t3);margin-bottom:6px;}
  .modal-input{width:100%;background:var(--surface);border:1px solid var(--line2);border-radius:6px;padding:8px 12px;font-family:'Archivo',sans-serif;font-size:13px;color:var(--t1);outline:none;transition:border-color .15s;}
  .modal-input:focus{border-color:rgba(16,185,129,.4);}
  .modal-textarea{width:100%;background:var(--surface);border:1px solid var(--line2);border-radius:6px;padding:10px 12px;font-family:'Archivo',sans-serif;font-size:12.5px;color:var(--t2);outline:none;transition:border-color .15s;resize:vertical;min-height:160px;line-height:1.6;}
  .modal-textarea:focus{border-color:rgba(16,185,129,.4);color:var(--t1);}
  .modal-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;}
  .modal-btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.35);}
  .modal-btn-primary:hover{background:#34d399;box-shadow:0 0 22px rgba(16,185,129,.55);}
  .modal-btn-secondary{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .modal-btn-secondary:hover{border-color:var(--t2);}
  .modal-btn:disabled{opacity:.5;cursor:not-allowed;}
  .modal-success{text-align:center;padding:24px 0 8px;}
  .copy-notice{font-size:11px;color:var(--g);margin-top:6px;text-align:center;}
  .wa-info{background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.15);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--t2);line-height:1.5;}

  @media(max-width:1024px){
    .rem-layout{grid-template-columns:1fr;}
    .sched-card{display:none;}
    .rem-row{grid-template-columns:36px 1fr 100px 90px;}
    .inv-table-head{grid-template-columns:36px 1fr 100px 90px;}
    .inv-table-head>*:nth-child(5),.rem-row>*:nth-child(5){display:none;}
  }
  @media(max-width:600px){.content{padding:16px;}.topbar{padding:0 16px;}}
`

const SCHEDULE_RULES = [
  { day: '3',  label: '3-day reminder',   desc: 'Gentle first nudge',  badgeBg: 'var(--g-dim)',        badgeColor: 'var(--g)',      defaultOn: true  },
  { day: '7',  label: '7-day reminder',   desc: 'Polite follow-up',    badgeBg: 'rgba(224,160,48,.1)', badgeColor: 'var(--warn)',   defaultOn: true  },
  { day: '14', label: '14-day reminder',  desc: 'Firm final notice',   badgeBg: 'rgba(224,85,64,.1)',  badgeColor: 'var(--danger)', defaultOn: true  },
  { day: '30', label: '30-day escalation',desc: 'Final demand notice', badgeBg: 'rgba(224,85,64,.15)', badgeColor: 'var(--danger)', defaultOn: false },
]

type ComposeState = {
  inv:       Invoice
  tab:       'email' | 'whatsapp'
  emailTo:   string
  emailBody: string
  waBody:    string
  sending:   boolean
  sent:      boolean
  copied:    boolean
  err:       string
}

export default function RemindersClient({
  initialInvoices,
  initialReminders,
  firmName,
}: {
  initialInvoices:  Invoice[]
  initialReminders: Reminder[]
  firmName:         string
}) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [autoOn,    setAutoOn]    = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const r of initialReminders) {
      if (r.status === 'scheduled') map[r.invoice_id] = true
    }
    return map
  })
  const [toggling,  setToggling]  = useState<Record<string, boolean>>({})
  const [remError,  setRemError]  = useState<string | null>(null)
  const [schedule,  setSchedule]  = useState<Record<string, boolean>>(
    Object.fromEntries(SCHEDULE_RULES.map(r => [r.day, r.defaultOn]))
  )
  const [waOn,      setWaOn]      = useState(false)
  const [compose,   setCompose]   = useState<ComposeState | null>(null)

  const pending = useMemo(
    () => initialInvoices.filter(i => ACTIVE_STATUSES.includes(i.status)),
    [initialInvoices]
  )

  const remStats = useMemo(() => {
    const map: Record<string, { sent: number; queued: number }> = {}
    for (const r of reminders) {
      const s = map[r.invoice_id] ?? { sent: 0, queued: 0 }
      if (r.status === 'sent')      s.sent++
      if (r.status === 'scheduled') s.queued++
      map[r.invoice_id] = s
    }
    return map
  }, [reminders])

  function openCompose(inv: Invoice) {
    setCompose({
      inv,
      tab:       'email',
      emailTo:   inv.client_email || '',
      emailBody: genEmail(inv, firmName),
      waBody:    genWhatsApp(inv, firmName),
      sending:   false,
      sent:      false,
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
      setCompose(p => p ? { ...p, sending: false, sent: true } : null)
    } catch (e: any) {
      setCompose(p => p ? { ...p, sending: false, err: e.message } : null)
    }
  }

  function copyWa() {
    if (!compose) return
    navigator.clipboard.writeText(compose.waBody).then(() => {
      setCompose(p => p ? { ...p, copied: true } : null)
      setTimeout(() => setCompose(p => p ? { ...p, copied: false } : null), 2000)
    })
  }

  async function toggleAuto(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation()
    if (toggling[inv.id]) return
    setToggling(p => ({ ...p, [inv.id]: true }))

    if (autoOn[inv.id]) {
      const toDelete = reminders.filter(r => r.invoice_id === inv.id && r.status === 'scheduled')
      await Promise.all(toDelete.map(r =>
        fetch(`/api/reminders/${r.id}`, { method: 'DELETE', credentials: 'include' })
      ))
      setReminders(prev => prev.filter(r => !(r.invoice_id === inv.id && r.status === 'scheduled')))
      setAutoOn(p => ({ ...p, [inv.id]: false }))
    } else {
      const channels: Array<'email' | 'whatsapp'> = []
      if (inv.client_email) channels.push('email')
      if (waOn && inv.client_phone) channels.push('whatsapp')
      if (channels.length === 0) {
        setRemError('No email or phone on this invoice — add contact details first.')
        setTimeout(() => setRemError(null), 3500)
        setToggling(p => ({ ...p, [inv.id]: false }))
        return
      }
      const base = inv.due_date ? new Date(inv.due_date) : new Date()
      const created: Reminder[] = []
      for (const ch of channels) {
        for (const rule of SCHEDULE_RULES) {
          if (!schedule[rule.day]) continue
          const sendAt = new Date(base)
          sendAt.setDate(sendAt.getDate() + parseInt(rule.day))
          if (sendAt <= new Date()) continue
          const res = await fetch('/api/reminders', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: inv.id, channel: ch, send_at: sendAt.toISOString(), days_after_due: parseInt(rule.day) }),
          })
          if (res.ok) { const { reminder } = await res.json(); created.push(reminder) }
        }
      }
      if (created.length > 0) {
        setReminders(prev => [...prev, ...created])
        setAutoOn(p => ({ ...p, [inv.id]: true }))
      } else {
        setRemError('All reminder dates are in the past — update the due date first.')
        setTimeout(() => setRemError(null), 3500)
      }
    }
    setToggling(p => ({ ...p, [inv.id]: false }))
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="page-title">REMINDERS</div>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            New Invoice
          </Link>
        </div>
      </div>

      <div className="content">
        {remError && (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#F87171', marginBottom: 16 }}>
            {remError}
          </div>
        )}
        <div className="rem-layout">

          {/* Left — invoice list */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
              Click any invoice row to compose a reminder message
            </div>
            <div className="inv-table-wrap">
              <div className="inv-table-head">
                <div></div>
                <div className="inv-th">Invoice</div>
                <div className="inv-th">Amount</div>
                <div className="inv-th">Overdue</div>
                <div className="inv-th">Reminders</div>
                <div className="inv-th">Actions</div>
              </div>

              {pending.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-illustration" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#10B981" strokeWidth="1.8">
                      <circle cx="14" cy="14" r="10"/><path d="M8 14l4 4 8-8"/>
                    </svg>
                  </div>
                  <div className="empty-title">Cash flow is healthy</div>
                  <div className="empty-sub">No pending or overdue invoices right now. Send more invoices to keep the momentum going.</div>
                  <Link href="/new-invoice" className="empty-cta">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
                    New Invoice
                  </Link>
                </div>
              ) : (
                pending.map(inv => {
                  const days  = daysOverdue(inv.due_date)
                  const color = urgencyColor(days)
                  const label = daysLabel(days)
                  const sym   = inv.currency || 'P'
                  const stats = remStats[inv.id] ?? { sent: 0, queued: 0 }
                  const isOn  = !!autoOn[inv.id]
                  return (
                    <div key={inv.id} className="rem-row" onClick={() => openCompose(inv)} title="Click to compose reminder">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="rem-urgency" style={{ background: color, boxShadow: `0 0 6px ${color}44` }}/>
                      </div>
                      <div>
                        <div className="rem-client">{inv.client_name}</div>
                        <div className="rem-inv">{inv.invoice_number}{inv.project ? ` · ${inv.project}` : ''}</div>
                      </div>
                      <div className="rem-amount" style={{ color }}>{fmt(Number(inv.total || 0), sym)}</div>
                      <div style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)' }}>{stats.sent} sent · {stats.queued} queued</div>
                      <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                        <button
                          className={`rem-toggle${isOn ? ' active' : ''}`}
                          onClick={e => toggleAuto(inv, e)}
                          disabled={!!toggling[inv.id]}
                        >
                          {toggling[inv.id] ? '…' : isOn ? '● Auto' : '○ Auto'}
                        </button>
                        <button className="compose-btn" onClick={e => { e.stopPropagation(); openCompose(inv) }}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12l1-4L11 2l3 3-8 6-4 1z"/><path d="M9 4l3 3"/></svg>
                          Send
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right — schedule card */}
          <div className="sched-card">
            <div className="sched-header">
              <div className="sched-title">Auto-reminder schedule</div>
              <div className="sched-sub">Applies to scheduled auto-reminders</div>
            </div>
            {SCHEDULE_RULES.map(rule => (
              <div key={rule.day} className="sched-rule">
                <div className="sched-rule-left">
                  <div className="sched-day-badge" style={{ background: rule.badgeBg, color: rule.badgeColor }}>{rule.day}</div>
                  <div>
                    <div className="sched-rule-name">{rule.label}</div>
                    <div className="sched-rule-desc">{rule.desc}</div>
                  </div>
                </div>
                <div className={`toggle-sw${schedule[rule.day] ? ' on' : ''}`} onClick={() => setSchedule(p => ({ ...p, [rule.day]: !p[rule.day] }))}/>
              </div>
            ))}
            <div className="sched-channel-row">
              <div className="sched-channel-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#25D366">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8zm4.15 11.17c-.17.48-.99.92-1.37.98-.35.06-.79.08-1.27-.08-.29-.1-.67-.23-1.15-.45-2.02-.87-3.34-2.91-3.44-3.05-.1-.13-.82-1.09-.82-2.08 0-.99.52-1.48.71-1.68.18-.2.4-.25.53-.25h.38c.12 0 .29-.05.45.34.17.4.57 1.39.62 1.49.05.1.08.22.02.35-.06.13-.1.21-.2.32-.1.11-.21.25-.3.33-.1.1-.2.2-.09.4.12.2.52.85 1.12 1.38.77.68 1.42.89 1.62.99.2.1.32.08.44-.05.12-.13.5-.58.63-.78.13-.2.27-.17.45-.1.18.07 1.14.54 1.34.63.2.1.33.14.38.22.05.08.05.47-.12.95z"/>
                </svg>
                WhatsApp reminders
                <span className="wa-badge">Channel</span>
              </div>
              <div className={`toggle-sw${waOn ? ' on' : ''}`} onClick={() => setWaOn(p => !p)}/>
            </div>
          </div>

        </div>
      </div>

      {/* Compose modal */}
      {compose && (
        <div className="modal-backdrop" onClick={() => !compose.sending && setCompose(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="modal-title">
                  <span>Send reminder — {compose.inv.invoice_number}</span>
                  <button className="modal-close" onClick={() => setCompose(null)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l12 12M14 2L2 14"/></svg>
                  </button>
                </div>
                <div className="modal-sub">
                  {compose.inv.client_name} · {fmt(compose.inv.total, compose.inv.currency || 'P')}
                  {compose.inv.due_date ? ` · Due ${compose.inv.due_date}` : ''}
                </div>
              </div>
            </div>

            {!compose.sent ? (
              <>
                <div className="modal-tabs">
                  <button className={`modal-tab${compose.tab === 'email' ? ' active' : ''}`} onClick={() => setCompose(p => p ? { ...p, tab: 'email' } : null)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display:'inline',marginRight:5 }}><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/></svg>
                    Email
                  </button>
                  <button className={`modal-tab${compose.tab === 'whatsapp' ? ' active' : ''}`} onClick={() => setCompose(p => p ? { ...p, tab: 'whatsapp' } : null)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="#25D366" style={{ display:'inline',marginRight:5 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/></svg>
                    WhatsApp
                  </button>
                </div>

                <div className="modal-body">
                  {compose.tab === 'email' ? (
                    <>
                      <div className="modal-field">
                        <div className="modal-label">To</div>
                        <input className="modal-input" type="email" placeholder="client@example.com"
                          value={compose.emailTo} onChange={e => setCompose(p => p ? { ...p, emailTo: e.target.value } : null)} />
                      </div>
                      <div className="modal-field">
                        <div className="modal-label" style={{ display:'flex', justifyContent:'space-between' }}>
                          <span>Message</span>
                          <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>Edit before sending</span>
                        </div>
                        <textarea className="modal-textarea" value={compose.emailBody}
                          onChange={e => setCompose(p => p ? { ...p, emailBody: e.target.value } : null)} />
                      </div>
                      {compose.err && <div style={{ fontSize:12, color:'var(--danger)', marginBottom:10 }}>{compose.err}</div>}
                    </>
                  ) : (
                    <>
                      <div className="wa-info">
                        <strong>Copy this message</strong> and paste it into WhatsApp.
                        The message is pre-written and ready to send.
                      </div>
                      <div className="modal-field">
                        <div className="modal-label" style={{ display:'flex', justifyContent:'space-between' }}>
                          <span>Message</span>
                          <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>Edit if needed</span>
                        </div>
                        <textarea className="modal-textarea" value={compose.waBody}
                          onChange={e => setCompose(p => p ? { ...p, waBody: e.target.value } : null)} />
                      </div>
                      {compose.inv.client_phone && (
                        <div style={{ fontSize:12, color:'var(--t3)', marginTop:4 }}>
                          Client phone: <strong style={{ color:'var(--t2)' }}>{compose.inv.client_phone}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="modal-btn modal-btn-secondary" onClick={() => setCompose(null)}>Cancel</button>
                  {compose.tab === 'email' ? (
                    <button className="modal-btn modal-btn-primary" onClick={sendEmail} disabled={compose.sending || !compose.emailTo}>
                      {compose.sending ? 'Sending…' : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
                          Send Email
                        </>
                      )}
                    </button>
                  ) : (
                    <button className="modal-btn modal-btn-primary" onClick={copyWa}>
                      {compose.copied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="1" width="9" height="11" rx="1"/><rect x="1" y="4" width="9" height="11" rx="1"/></svg>
                          Copy Message
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="modal-body">
                <div className="modal-success">
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
                  </div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:6 }}>Reminder sent!</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginBottom:16 }}>Email delivered to {compose.emailTo}</div>
                  <button className="modal-btn modal-btn-secondary" onClick={() => setCompose(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
