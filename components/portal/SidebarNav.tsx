'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'
import ThemeToggleBtn from './ThemeToggleBtn'
import { LogoIcon } from '@/components/Logo'

const CSS = `
  :root{
    --g:#F2A900;--g2:#C98C00;--g-dim:rgba(242,169,0,0.1);--g-glow:rgba(242,169,0,0.2);
    --bg:#18213A;--bg2:#1F2A44;--bg3:#18213A;--surface:#1F2A44;--surface2:#2B3756;
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

  /* ── DESKTOP SIDEBAR ── */
  .sidebar{
    width:224px;flex-shrink:0;
    background:var(--bg2);
    border-right:1px solid var(--line);
    display:flex;flex-direction:column;
    height:100vh;position:relative;
  }
  .sidebar::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,var(--g) 0%,transparent 60%);
    opacity:.7;z-index:1;
  }
  .sidebar-logo{
    padding:22px 20px 16px;
    border-bottom:1px solid var(--line);
    font-family:var(--font-bebas),sans-serif;font-weight:700;
    font-size:23px;letter-spacing:3px;color:var(--t1);
  }
  .sidebar-logo em{color:var(--g);font-style:normal;}
  .sidebar-logo small{
    display:block;font-family:var(--font-archivo),sans-serif;
    font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--t3);font-weight:500;margin-top:2px;
  }
  .desk-nav{display:flex;flex-direction:column;flex:1;overflow-y:auto;scrollbar-width:none;}
  .desk-nav::-webkit-scrollbar{display:none;}
  .nav-section{
    padding:10px 14px 3px;font-size:10px;
    letter-spacing:.14em;text-transform:uppercase;
    color:var(--t3);font-weight:600;
  }
  .nav-item{
    display:flex;align-items:center;gap:10px;
    padding:7px 12px;border-radius:6px;margin:1px 8px;
    font-size:13px;color:var(--t2);cursor:pointer;
    transition:all .15s;position:relative;
    text-decoration:none;background:transparent;border:none;
    width:calc(100% - 16px);font-family:var(--font-archivo),sans-serif;font-weight:700;
  }
  .nav-item:hover{background:var(--surface);color:var(--t1);}
  .nav-item.active{background:var(--g-dim);color:var(--g);}
  .nav-item.active::before{
    content:'';position:absolute;left:-8px;top:50%;
    transform:translateY(-50%);
    width:3px;height:55%;background:var(--g);
    border-radius:0 2px 2px 0;
  }
  .nav-icon{width:15px;height:15px;opacity:.6;flex-shrink:0;}
  .nav-item.active .nav-icon{opacity:1;}
  .nav-badge{
    margin-left:auto;background:var(--danger);color:#fff;
    font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;
    letter-spacing:.02em;
  }
  .sidebar-footer{margin-top:auto;padding:16px 12px;border-top:1px solid var(--line);}
  .user-pill{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background .15s;position:relative;}
  .user-pill:hover{background:var(--surface);}
  .user-av{width:32px;height:32px;border-radius:50%;background:var(--g-dim);border:1px solid rgba(242,169,0,.25);display:flex;align-items:center;justify-content:center;font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:13px;color:var(--g);flex-shrink:0;}
  .user-name{font-size:13px;color:var(--t1);font-weight:500;}
  .user-plan{font-size:11px;color:var(--g);}
  .profile-popup{
    position:absolute;bottom:calc(100% + 8px);left:0;right:0;
    background:var(--bg2);border:1px solid var(--line2);border-radius:10px;
    box-shadow:0 8px 24px rgba(0,0,0,.25);overflow:hidden;z-index:200;
    animation:popupIn .15s ease both;
  }
  @keyframes popupIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .profile-popup-header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);}
  .profile-popup-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 14px;background:transparent;border:none;font-family:var(--font-archivo),sans-serif;font-weight:700;font-size:13px;color:var(--t2);cursor:pointer;text-align:left;transition:background .12s,color .12s;}
  .profile-popup-item:hover{background:var(--surface);color:var(--t1);}
  .profile-popup-item.danger{color:var(--danger);}
  .biz-switch{padding:6px 0 0;}
  .biz-label{padding:4px 14px 6px;font-size:11px;font-weight:600;color:var(--t3);}
  .biz-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 14px;border:0;background:transparent;font:600 13px var(--font-manrope),sans-serif;color:var(--t2);cursor:pointer;text-align:left;}
  .biz-item:hover:not(:disabled){background:var(--surface);color:var(--t1);}
  .biz-item[aria-current="true"]{color:var(--t1);box-shadow:inset 3px 0 0 var(--g);}
  .biz-item:disabled{opacity:.55;cursor:default;}
  .biz-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .biz-role{flex:none;font-size:11px;font-weight:600;color:var(--t3);}
  .biz-error{padding:4px 14px 8px;font-size:12px;color:var(--danger);}
  .profile-popup-item.danger:hover{background:rgba(224,85,64,.08);color:var(--danger);}
  .profile-popup-divider{height:1px;background:var(--line);margin:2px 0;}

  /* ── MOBILE TOP BAR ── */
  .mob-topbar{display:none;}
  .mob-menu-popup{display:none;}

  /* ── MOBILE BOTTOM TAB BAR ── */
  .mob-tabbar{display:none;}

  @media(max-width:768px){
    /* Mobile top bar */
    .mob-topbar{
      display:flex;align-items:center;justify-content:space-between;
      position:fixed;top:0;left:0;right:0;z-index:999;
      height:calc(44px + env(safe-area-inset-top,0px));
      padding:env(safe-area-inset-top,0px) 16px 0;
      background:rgba(24,33,58,0.94);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-bottom:1px solid var(--line);
    }
    html[data-theme="light"] .mob-topbar{background:#FAF7F0;border-bottom-color:rgba(31,42,68,0.08);}
    html[data-theme="light"] .mob-topbar-logo{color:var(--t1);}
    html[data-theme="light"] .mob-tab{color:#3d3830;}
    html[data-theme="light"] .mob-tab.active{color:var(--g);}
    html[data-theme="light"] .mob-tab svg{stroke:#3d3830 !important;}
    html[data-theme="light"] .mob-tab.active svg{stroke:#F2A900 !important;}
    html[data-theme="light"] .mob-tab.active::before{background:var(--g);}
    html[data-theme="light"] .mob-tab span{color:#3d3830 !important;}
    html[data-theme="light"] .mob-tab.active span{color:#F2A900 !important;font-weight:700;}
    .mob-topbar-logo{
      display:flex;align-items:center;gap:8px;text-decoration:none;
      font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:20px;letter-spacing:2px;color:var(--t1);
    }
    .mob-topbar-logo em{color:var(--g);font-style:normal;}
    .mob-topbar-av{
      width:30px;height:30px;border-radius:50%;
      background:var(--g-dim);border:1px solid rgba(242,169,0,.25);
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:12px;color:var(--g);
      cursor:pointer;-webkit-tap-highlight-color:transparent;
    }
    .mob-menu-popup{
      display:block;
      position:fixed;top:calc(44px + env(safe-area-inset-top,0px));right:0;width:220px;
      background:var(--bg2);border:1px solid var(--line2);
      border-radius:0 0 10px 10px;
      box-shadow:0 8px 24px rgba(0,0,0,.3);
      z-index:1001;
      animation:popupIn .15s ease both;
    }

    /* Sidebar becomes a shell — only the mob-tabbar inside it is visible */
    .sidebar{
      width:100%;height:auto;min-height:auto;
      flex-direction:column;
      border-right:none;border-top:1px solid var(--line);
      position:fixed;bottom:0;left:0;right:0;top:auto;
      z-index:1000;
      background:rgba(24,33,58,0.94);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      padding-bottom:env(safe-area-inset-bottom,0px);
    }
    html[data-theme="light"] .sidebar{background:#FAF7F0;border-top-color:rgba(31,42,68,0.10);}
    .sidebar::before{display:none;}
    .sidebar-logo{display:none;}
    .desk-nav{display:none;}
    .sidebar-footer{display:none;}

    /* Tab bar — reset every property that globals.css nav{} sets */
    .mob-tabbar{
      display:flex;flex-direction:row;
      align-items:stretch;height:56px;
      background:transparent;
      position:static;
      padding:0;
      border:none;
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
    }

    /* Regular tab */
    .mob-tab{
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      flex:1;gap:3px;
      font-size:10px;font-family:var(--font-archivo),sans-serif;font-weight:500;
      color:var(--t3);text-decoration:none;
      position:relative;cursor:pointer;
      background:transparent;border:none;padding:0;
      transition:color .15s;
      -webkit-tap-highlight-color:transparent;
    }
    .mob-tab.active{color:var(--g);}
    .mob-tab.active span{color:#F2A900 !important;font-weight:700;}
    .mob-tab.active::before{
      content:'';position:absolute;
      top:0;left:50%;transform:translateX(-50%);
      width:28px;height:2px;
      background:var(--g);border-radius:0 0 3px 3px;
    }
    .mob-tab svg{width:20px;height:20px;transition:stroke .15s;}
    .mob-tab.active svg{stroke:#F2A900 !important;}

    /* Overdue badge on invoices tab */
    .mob-overdue{
      position:absolute;top:7px;right:calc(50% - 20px);
      background:var(--danger);color:#fff;
      font-size:9px;font-weight:700;
      padding:1px 5px;border-radius:999px;
      min-width:14px;text-align:center;line-height:1.4;
      pointer-events:none;
    }

    /* FAB — New Invoice */
    .mob-fab{
      display:flex;flex:1;
      align-items:center;justify-content:center;
      height:56px;text-decoration:none;
      -webkit-tap-highlight-color:transparent;
    }
    .mob-fab-inner{
      width:46px;height:46px;
      background:var(--g);border-radius:14px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 0 1px rgba(242,169,0,.3),0 0 18px rgba(242,169,0,.45),0 4px 12px rgba(242,169,0,.25);
      transition:transform .15s,box-shadow .15s;
    }
    .mob-fab:active .mob-fab-inner{
      transform:scale(.91);
      box-shadow:0 0 10px rgba(242,169,0,.25),0 2px 6px rgba(242,169,0,.15);
    }
  }
`

type Business = { accountId: string; name: string; role: 'owner' | 'admin' | 'staff'; paused: boolean }

interface Props {
  displayName: string
  userEmail: string
  plan?: string
  overdueCt?: number
  // Every business the person can work in, and the one open now. The switcher
  // shows only when there's more than one.
  businesses?: Business[]
  currentAccountId?: string
  role?: 'owner' | 'admin' | 'staff'
}

const ROLE_NAME = { owner: 'Owner', admin: 'Admin', staff: 'Staff' } as const

function BusinessSwitcher({ businesses, current, onDone }: { businesses: Business[]; current?: string; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  async function switchTo(accountId: string) {
    if (accountId === current) return onDone()
    setBusy(accountId); setError('')
    try {
      const res = await fetch('/api/account/switch', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Couldn’t switch business'); return }
      // A full load, so every page re-reads the business it's now in.
      window.location.href = '/dashboard'
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="biz-switch" role="group" aria-label="Switch business">
      <div className="biz-label">Businesses</div>
      {businesses.map(b => (
        <button key={b.accountId} type="button" className="biz-item" aria-current={b.accountId === current ? 'true' : undefined}
          disabled={!!busy || (b.paused && b.accountId !== current)} onClick={() => switchTo(b.accountId)}>
          <span className="biz-name">{b.name}</span>
          <span className="biz-role">{busy === b.accountId ? 'Opening…' : b.paused ? 'Paused' : ROLE_NAME[b.role]}</span>
        </button>
      ))}
      {error && <div className="biz-error" role="alert">{error}</div>}
      <div className="profile-popup-divider"/>
    </div>
  )
}

export default function SidebarNav({ displayName, userEmail, plan = 'free', overdueCt = 0, businesses = [], currentAccountId, role = 'owner' }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  const [mobMenuOpen, setMobMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobMenuOpen) return
    const close = () => setMobMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [mobMenuOpen])

  const initials = displayName
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??'

  async function handleLogout() {
    const supa = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supa.auth.signOut()
    try { sessionStorage.removeItem('sp-splash') } catch {}
    router.push('/auth/login')
  }

  function is(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  // In a team business, the role says more than the owner's plan does.
  const planLabel = role !== 'owner' ? ROLE_NAME[role] : plan === 'business' ? 'Business Plan' : plan === 'pro' ? 'Pro Plan' : 'Free Plan'
  const showSwitcher = businesses.length > 1

  return (
    <>
      <style>{CSS}</style>

      {/* ── MOBILE TOP BAR ── */}
      <div className="mob-topbar">
        <Link href="/dashboard" className="mob-topbar-logo">
          <span style={{ display: 'inline-flex', width: 22, height: 22, flexShrink: 0 }}>
            <LogoIcon />
          </span>
          <span>STAGE<em>PAY</em></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggleBtn />
          <button
            className="mob-topbar-av"
            onClick={e => { e.stopPropagation(); setMobMenuOpen(p => !p) }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Mobile profile dropdown */}
      {mobMenuOpen && (
        <div className="mob-menu-popup" onClick={e => e.stopPropagation()}>
          <div className="profile-popup-header">
            <div className="user-av" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
            </div>
          </div>
          {showSwitcher && <BusinessSwitcher businesses={businesses} current={currentAccountId} onDone={() => setMobMenuOpen(false)} />}
          <button className="profile-popup-item" onClick={() => { setMobMenuOpen(false); router.push('/settings') }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
          <div className="profile-popup-divider"/>
          <button className="profile-popup-item danger" onClick={() => { setMobMenuOpen(false); handleLogout() }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/></svg>
            Log out
          </button>
        </div>
      )}

      <aside className="sidebar">

        {/* ── DESKTOP SIDEBAR ── */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', width: 28, height: 28, flexShrink: 0 }}>
              <LogoIcon />
            </span>
            <span style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: 3 }}>
              Stage<em>Pay</em>
            </span>
          </div>
          <small>Professional invoicing</small>
        </div>

        <div className="desk-nav">
          <div className="nav-section">Main</div>

          <Link href="/dashboard" className={`nav-item${is('/dashboard') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
            <span>Dashboard</span>
          </Link>

          <Link href="/new-invoice" className={`nav-item${is('/new-invoice') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>
            <span>New Invoice</span>
          </Link>

          <Link href="/invoices" className={`nav-item${is('/invoices') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 6h6M5 9h4"/></svg>
            <span>Invoices</span>
            {overdueCt > 0 && <span className="nav-badge">{overdueCt}</span>}
          </Link>

          <Link href="/clients" className={`nav-item${is('/clients') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/></svg>
            <span>Clients</span>
          </Link>

          <Link href="/reminders" className={`nav-item${is('/reminders') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/><path d="M6.5 13a1.5 1.5 0 003 0"/></svg>
            <span>Reminders</span>
          </Link>

          <Link href="/tutorial" className={`nav-item${is('/tutorial') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v4"/><circle cx="8" cy="11" r=".5" fill="currentColor"/></svg>
            <span>Getting Started</span>
          </Link>

          <div className="nav-section">Account</div>

          <Link href="/settings" className={`nav-item${is('/settings') ? ' active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 10px', marginBottom: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>Theme</span>
            <ThemeToggleBtn />
          </div>
          <div className="user-pill" onClick={() => setPopupOpen(p => !p)}>
            {popupOpen && (
              <div className="profile-popup" onClick={e => e.stopPropagation()}>
                <div className="profile-popup-header">
                  <div className="user-av" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
                  </div>
                </div>
                {showSwitcher && <BusinessSwitcher businesses={businesses} current={currentAccountId} onDone={() => setPopupOpen(false)} />}
                <button className="profile-popup-item" onClick={() => { setPopupOpen(false); router.push('/settings') }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
                  Edit profile
                </button>
                <button className="profile-popup-item" onClick={() => { setPopupOpen(false); router.push('/settings') }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  Account settings
                </button>
                <div className="profile-popup-divider"/>
                <button className="profile-popup-item danger" onClick={() => { setPopupOpen(false); handleLogout() }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/></svg>
                  Log out
                </button>
              </div>
            )}
            <div className="user-av">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{displayName}</div>
              <div className="user-plan">{planLabel}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--t3)', flexShrink: 0 }}><circle cx="8" cy="4" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="8" cy="12" r="1"/></svg>
          </div>
        </div>

        {/* ── MOBILE BOTTOM TAB BAR ── */}
        <nav className="mob-tabbar">

          {/* Dashboard */}
          <Link href="/dashboard" className={`mob-tab${is('/dashboard') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={is('/dashboard') ? { stroke: '#F2A900' } : undefined}>
              <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>
            <span style={is('/dashboard') ? { color: '#F2A900', fontWeight: 700 } : undefined}>Home</span>
          </Link>

          {/* Invoices (with overdue badge) */}
          <Link href="/invoices" className={`mob-tab${is('/invoices') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={is('/invoices') ? { stroke: '#F2A900' } : undefined}>
              <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
              <path d="M5 6h6M5 9h4"/>
            </svg>
            {overdueCt > 0 && <span className="mob-overdue">{overdueCt}</span>}
            <span style={is('/invoices') ? { color: '#F2A900', fontWeight: 700 } : undefined}>Invoices</span>
          </Link>

          {/* FAB — New Invoice */}
          <Link href="/new-invoice" className="mob-fab" aria-label="New Invoice">
            <div className="mob-fab-inner">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 3v10M3 8h10"/>
              </svg>
            </div>
          </Link>

          {/* Clients */}
          <Link href="/clients" className={`mob-tab${is('/clients') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={is('/clients') ? { stroke: '#F2A900' } : undefined}>
              <circle cx="8" cy="5" r="3"/>
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/>
            </svg>
            <span style={is('/clients') ? { color: '#F2A900', fontWeight: 700 } : undefined}>Clients</span>
          </Link>

          {/* Reminders (Settings lives in the avatar menu on phones) */}
          <Link href="/reminders" className={`mob-tab${is('/reminders') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={is('/reminders') ? { stroke: '#F2A900' } : undefined}>
              <path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/>
              <path d="M6.5 13a1.5 1.5 0 003 0"/>
            </svg>
            <span style={is('/reminders') ? { color: '#F2A900', fontWeight: 700 } : undefined}>Reminders</span>
          </Link>

        </nav>

      </aside>
    </>
  )
}
