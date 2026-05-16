import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ThemeToggleBtn from '@/components/portal/ThemeToggleBtn'

const AVATAR_COLOR = '#10B981'

function avatarColor(_name: string, _index: number): string {
  return AVATAR_COLOR
}

function initials(name: string): string {
  return (name || '').split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 2) || '??'
}

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const CSS = `
:root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;
  }
  html[data-theme="light"]{
    --bg:#F8FAFC;--bg2:#FFFFFF;--surface:#F1F5F9;
    --line:rgba(15,23,42,0.08);--line2:rgba(15,23,42,0.14);
    --t1:#0F172A;--t2:rgba(15,23,42,0.65);--t3:rgba(15,23,42,0.38);
    --g-dim:rgba(16,185,129,0.08);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:var(--font-archivo),sans-serif;background:var(--bg);color:var(--t1);}

  .content{flex:1;overflow-y:auto;padding:24px 28px;}

  /* topbar */
  .topbar{
    height:56px;flex-shrink:0;
    border-bottom:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-between;
    padding:0 28px;background:var(--bg2);
  }
  .page-title{
    font-family:var(--font-bebas),sans-serif;
    font-size:20px;letter-spacing:2.5px;color:var(--t1);
  }
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{
    display:flex;align-items:center;gap:7px;
    padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;
    cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;
    text-transform:uppercase;font-family:var(--font-archivo),sans-serif;text-decoration:none;
  }
  .btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.4),0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 0 24px rgba(16,185,129,.6),0 4px 16px rgba(16,185,129,.3);}
  .btn-outline{background:transparent;color:var(--t2);border:1px solid var(--line2);}
  .btn-outline:hover{border-color:var(--g);color:var(--g);}

  /* stat cards */
  @keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
  @media(max-width:700px){.stats-row{grid-template-columns:1fr 1fr;}}
  @media(max-width:480px){.stats-row{grid-template-columns:1fr;}}
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .mob-hide{display:none;}
    .content{padding:16px;}
  }
  .card{
    background:var(--bg2);border:1px solid var(--line);
    border-radius:12px;overflow:hidden;
    transition:border-color .2s;
  }
  .stat-inner{padding:20px 24px;animation:cardIn .5s ease both;}
  .stat-label-sm{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);margin-bottom:10px;}
  .stat-val-big{font-family:var(--font-bebas),sans-serif;font-size:40px;letter-spacing:1px;line-height:1;}
  .stat-sub-sm{font-size:12px;color:var(--t3);margin-top:4px;}

  /* recent invoices card */
  .card-header{
    padding:16px 22px;border-bottom:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-between;
    background:var(--bg2);
  }
  .card-title{font-size:12px;font-weight:600;color:var(--t1);letter-spacing:.08em;text-transform:uppercase;}
  .card-body{padding:0;}
  .inv-list-item{
    display:flex;align-items:center;gap:14px;
    padding:13px 22px;border-bottom:1px solid var(--line);
    transition:background .15s;cursor:pointer;
  }
  .inv-list-item:last-child{border-bottom:none;}
  .inv-list-item:hover{background:var(--surface);}
  .inv-avatar{
    width:36px;height:36px;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font-bebas),sans-serif;font-size:14px;flex-shrink:0;
  }
  .inv-info{flex:1;min-width:0;}
  .inv-client-name{font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .inv-num-small{font-size:11px;color:var(--t3);margin-top:1px;}
  .inv-amount-text{font-family:var(--font-bebas),sans-serif;font-size:18px;letter-spacing:.5px;}
  .pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}
  .pill-paid{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.25);}
  .pill-pending{background:rgba(245,158,11,.1);color:#fbbf24;border:1px solid rgba(245,158,11,.22);}
  .pill-sent{background:rgba(59,130,246,.12);color:#60a5fa;border:1px solid rgba(59,130,246,.22);}
  .pill-overdue{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.22);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(248,250,252,.3);border:1px solid rgba(100,116,139,.2);}

  .empty-state{text-align:center;padding:36px 20px;}
  .empty-illustration{width:52px;height:52px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:4px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:14px;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:var(--bg);border:none;border-radius:6px;padding:8px 16px;font-size:11px;font-weight:600;cursor:pointer;text-decoration:none;font-family:var(--font-archivo),sans-serif;letter-spacing:.04em;text-transform:uppercase;}
`

function statusPill(status: string) {
  return <span className={`pill pill-${status}`}>{status}</span>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const supabaseAny = supabase as any

  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hour = now.getHours()

  const [
    { data: recent },
    { count: unpaidCount },
    { count: overdueCount },
    { count: paidMonthCount },
    { data: profile },
  ] = await Promise.all([
    supabaseAny
      .from('invoices')
      .select('id, invoice_number, client_name, project, total, status, issue_date, currency')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAny
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'sent']),
    supabaseAny
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'overdue'),
    supabaseAny
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('issue_date', thisMonthStart),
    supabaseAny
      .from('profiles')
      .select('name, firm_name, default_currency')
      .eq('id', user.id)
      .single(),
  ])

  const sym = profile?.default_currency || 'P'
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (profile?.firm_name || profile?.name || '').split(' ')[0] || ''
  const greetingText = firstName ? `${greeting}, ${firstName}` : 'Welcome back'

  return (
    <>
      <style>{CSS}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="page-title">DASHBOARD</div>
        <div className="topbar-right">
          <ThemeToggleBtn />
          <Link href="/invoices" className="topbar-btn btn-outline mob-hide" style={{ textDecoration: 'none' }}>
            View all invoices
          </Link>
          <Link href="/new-invoice" className="topbar-btn btn-primary mob-hide" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            New Invoice
          </Link>
        </div>
      </div>

      <div className="content">

        {/* Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--t1)' }}>{greetingText}</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3 }}>Here&apos;s where things stand today.</div>
          </div>
          <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            New Invoice
          </Link>
        </div>

        {/* 3 stat cards */}
        <div className="stats-row">
          <div className="card">
            <div className="stat-inner">
              <div className="stat-label-sm">Unpaid</div>
              <div className="stat-val-big" style={{ color: 'var(--warn)' }}>{unpaidCount ?? 0}</div>
              <div className="stat-sub-sm">invoices awaiting payment</div>
            </div>
          </div>
          <div className="card">
            <div className="stat-inner" style={{ animationDelay: '.05s' }}>
              <div className="stat-label-sm">Overdue</div>
              <div className="stat-val-big" style={{ color: 'var(--danger)' }}>{overdueCount ?? 0}</div>
              <div className="stat-sub-sm">past due date</div>
            </div>
          </div>
          <div className="card">
            <div className="stat-inner" style={{ animationDelay: '.1s' }}>
              <div className="stat-label-sm">Paid this month</div>
              <div className="stat-val-big" style={{ color: 'var(--g)' }}>{paidMonthCount ?? 0}</div>
              <div className="stat-sub-sm">invoices settled</div>
            </div>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent invoices</span>
            <Link href="/invoices" className="topbar-btn btn-outline" style={{ padding: '4px 12px', fontSize: 11, textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          <div className="card-body">
            {(recent ?? []).length === 0 ? (
              <div className="empty-state">
                <div className="empty-illustration">
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="#3B82F6" strokeWidth="1.8"><path d="M5 4h14l4 4v16H5V4z"/><path d="M19 4v4h4"/><path d="M9 13h10M9 17h6"/></svg>
                </div>
                <div className="empty-title">No invoices yet</div>
                <div className="empty-sub">Your recent invoices will appear here.</div>
                <Link href="/new-invoice" className="empty-cta">Create first invoice</Link>
              </div>
            ) : (
              (recent ?? []).map((inv: any, i: number) => {
                const color = avatarColor(inv.client_name || '', i)
                const inv_initials = initials(inv.client_name || '')
                const currSym = inv.currency || sym
                return (
                  <Link key={inv.id} href="/invoices" className="inv-list-item" style={{ textDecoration: 'none' }}>
                    <div className="inv-avatar" style={{ background: `${color}22`, color }}>
                      {inv_initials}
                    </div>
                    <div className="inv-info">
                      <div className="inv-client-name">{inv.client_name || '—'}</div>
                      <div className="inv-num-small">{inv.invoice_number || '—'}{inv.project ? ` · ${inv.project}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="inv-amount-text" style={{ color }}>{fmt(Number(inv.total || 0), currSym)}</div>
                      <div style={{ marginTop: 3 }}>{statusPill(inv.status)}</div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

      </div>
    </>
  )
}
