'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type Invoice = {
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

type Reminder = {
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

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@400;500;600;700&display=swap');
  :root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}
  @keyframes spin{to{transform:rotate(360deg)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;background:transparent;color:var(--t2);}
  .topbar-btn:hover{border-color:var(--g);color:var(--g);}
  .btn-primary{background:var(--g);color:var(--bg);border:none;box-shadow:0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);color:var(--bg);}

  .content{padding:24px 28px;}

  .rem-layout{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start;}

  .inv-table-wrap{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:14px;}
  .inv-table-head{
    display:grid;grid-template-columns:36px 1fr 110px 100px 110px 120px;
    gap:12px;padding:11px 20px;border-bottom:1px solid var(--line);background:var(--surface);
  }
  .inv-th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .rem-row{
    display:grid;grid-template-columns:36px 1fr 110px 100px 110px 120px;
    gap:12px;padding:14px 20px;border-bottom:1px solid var(--line);
    align-items:center;transition:background .15s;
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
  .view-btn{
    display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:5px;
    font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--line2);
    background:transparent;color:var(--t2);font-family:'Archivo',sans-serif;
    transition:all .15s;text-decoration:none;
  }
  .view-btn:hover{border-color:var(--g);color:var(--g);}

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
  .toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:var(--t3);transition:transform .2s, background .2s;}
  .toggle-sw.on::after{transform:translateX(16px);background:#fff;}
  .sched-channel-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line);}
  .sched-channel-label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:500;color:var(--t2);}
  .wa-badge{font-size:9px;letter-spacing:.06em;text-transform:uppercase;background:rgba(37,211,102,.1);color:#25D366;border:1px solid rgba(37,211,102,.2);border-radius:3px;padding:2px 6px;font-weight:700;}
  .preview-email-box{margin:16px 20px;background:var(--surface);border:1px solid var(--line2);border-radius:8px;padding:14px;}
  .peb-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:8px;font-weight:600;}
  .peb-body{font-size:12px;color:var(--t2);line-height:1.65;}
  .peb-actions{display:flex;gap:8px;margin-top:10px;}

  .empty-state{text-align:center;padding:52px 20px;}
  .empty-illustration{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:6px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:18px;max-width:320px;margin-left:auto;margin-right:auto;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:var(--bg);border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;}

  .loading-spinner{display:flex;align-items:center;justify-content:center;padding:60px;gap:10px;color:var(--t3);font-size:13px;}

  @media(max-width:1024px){
    .rem-layout{grid-template-columns:1fr;}
    .sched-card{display:none;}
    .rem-row{grid-template-columns:36px 1fr 100px 90px;}
    .inv-table-head{grid-template-columns:36px 1fr 100px 90px;}
    .inv-table-head>*:nth-child(5),.rem-row>*:nth-child(5){display:none;}
  }
  @media(max-width:600px){
    .content{padding:16px;}
    .topbar{padding:0 16px;}
  }
`

const SCHEDULE_RULES = [
  { day: '3',  label: '3-day reminder',   desc: 'Gentle first nudge',   badgeBg: 'var(--g-dim)',               badgeColor: 'var(--g)',      defaultOn: true  },
  { day: '7',  label: '7-day reminder',   desc: 'Polite follow-up',     badgeBg: 'rgba(224,160,48,.1)',        badgeColor: 'var(--warn)',   defaultOn: true  },
  { day: '14', label: '14-day reminder',  desc: 'Firm final notice',    badgeBg: 'rgba(224,85,64,.1)',         badgeColor: 'var(--danger)', defaultOn: true  },
  { day: '30', label: '30-day escalation',desc: 'Final demand notice',  badgeBg: 'rgba(224,85,64,.15)',        badgeColor: 'var(--danger)', defaultOn: false },
]

export default function RemindersPage() {
  const [invoices,  setInvoices]  = useState<Invoice[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading,   setLoading]   = useState(true)
  const [autoOn,    setAutoOn]    = useState<Record<string, boolean>>({})
  const [toggling,  setToggling]  = useState<Record<string, boolean>>({})
  const [remError,  setRemError]  = useState<string | null>(null)
  const [schedule,  setSchedule]  = useState<Record<string, boolean>>(
    Object.fromEntries(SCHEDULE_RULES.map(r => [r.day, r.defaultOn]))
  )
  const [waOn, setWaOn] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices?page=0', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/reminders',       { credentials: 'include' }).then(r => r.json()),
    ]).then(([invData, remData]) => {
      const remList: Reminder[] = remData.reminders ?? []
      setInvoices(invData.invoices ?? [])
      setReminders(remList)
      const onMap: Record<string, boolean> = {}
      for (const r of remList) {
        if (r.status === 'scheduled') onMap[r.invoice_id] = true
      }
      setAutoOn(onMap)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const pending = useMemo(
    () => invoices.filter(i => ACTIVE_STATUSES.includes(i.status)),
    [invoices]
  )

  // Per-invoice reminder stats
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

  async function toggleAuto(inv: Invoice) {
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
            <div className="inv-table-wrap">
              <div className="inv-table-head">
                <div></div>
                <div className="inv-th">Invoice</div>
                <div className="inv-th">Amount</div>
                <div className="inv-th">Overdue</div>
                <div className="inv-th">Reminders</div>
                <div className="inv-th">Actions</div>
              </div>

              {loading ? (
                <div className="loading-spinner">
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.1)', borderTopColor: 'var(--g)', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>
                  Loading…
                </div>
              ) : pending.length === 0 ? (
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
                  const days   = daysOverdue(inv.due_date)
                  const color  = urgencyColor(days)
                  const label  = daysLabel(days)
                  const sym    = inv.currency || 'P'
                  const stats  = remStats[inv.id] ?? { sent: 0, queued: 0 }
                  const isOn   = !!autoOn[inv.id]
                  return (
                    <div key={inv.id} className="rem-row">
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`rem-toggle${isOn ? ' active' : ''}`}
                          onClick={() => toggleAuto(inv)}
                          disabled={!!toggling[inv.id]}
                        >
                          {toggling[inv.id] ? '…' : isOn ? '● Auto on' : '○ Auto off'}
                        </button>
                        <Link href="/invoices" className="view-btn">
                          View
                        </Link>
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
              <div className="sched-sub">Applies to all new invoices</div>
            </div>
            {SCHEDULE_RULES.map(rule => (
              <div key={rule.day} className="sched-rule">
                <div className="sched-rule-left">
                  <div className="sched-day-badge" style={{ background: rule.badgeBg, color: rule.badgeColor }}>
                    {rule.day}
                  </div>
                  <div>
                    <div className="sched-rule-name">{rule.label}</div>
                    <div className="sched-rule-desc">{rule.desc}</div>
                  </div>
                </div>
                <div
                  className={`toggle-sw${schedule[rule.day] ? ' on' : ''}`}
                  onClick={() => setSchedule(p => ({ ...p, [rule.day]: !p[rule.day] }))}
                />
              </div>
            ))}

            {/* WhatsApp channel toggle */}
            <div className="sched-channel-row">
              <div className="sched-channel-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#25D366">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8zm4.15 11.17c-.17.48-.99.92-1.37.98-.35.06-.79.08-1.27-.08-.29-.1-.67-.23-1.15-.45-2.02-.87-3.34-2.91-3.44-3.05-.1-.13-.82-1.09-.82-2.08 0-.99.52-1.48.71-1.68.18-.2.4-.25.53-.25h.38c.12 0 .29-.05.45.34.17.4.57 1.39.62 1.49.05.1.08.22.02.35-.06.13-.1.21-.2.32-.1.11-.21.25-.3.33-.1.1-.2.2-.09.4.12.2.52.85 1.12 1.38.77.68 1.42.89 1.62.99.2.1.32.08.44-.05.12-.13.5-.58.63-.78.13-.2.27-.17.45-.1.18.07 1.14.54 1.34.63.2.1.33.14.38.22.05.08.05.47-.12.95z"/>
                </svg>
                WhatsApp reminders
                <span className="wa-badge">Channel</span>
              </div>
              <div className={`toggle-sw${waOn ? ' on' : ''}`} onClick={() => setWaOn(p => !p)} />
            </div>

            {/* AI email preview */}
            <div className="preview-email-box">
              <div className="peb-label">AI email preview — 7-day</div>
              <div className="peb-body">
                Dear Client,<br/><br/>
                I wanted to follow up on your outstanding invoice, which appears to be unpaid. Please let me know if there are any issues — we are happy to assist.<br/><br/>
                Kind regards,<br/>Your Firm
              </div>
              <div className="peb-actions">
                <button className="topbar-btn" style={{ fontSize: 11, padding: '5px 10px', cursor: 'not-allowed', opacity: .5 }} disabled>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>
                  Rewrite with AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
