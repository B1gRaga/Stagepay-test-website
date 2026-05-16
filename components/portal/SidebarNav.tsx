'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'

const CSS = `
  :root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);--g-glow:rgba(16,185,129,0.2);
    --bg:#0F172A;--bg2:#1E293B;--bg3:#1E293B;--surface:#263244;--surface2:#2d3a50;
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
    font-family:var(--font-bebas),sans-serif;
    font-size:23px;letter-spacing:3px;color:var(--t1);
  }
  .sidebar-logo em{color:var(--g);font-style:normal;}
  .sidebar-logo small{
    display:block;font-family:var(--font-archivo),sans-serif;
    font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--t3);font-weight:500;margin-top:2px;
  }
  .desk-nav{display:flex;flex-direction:column;flex:1;overflow-y:auto;}
  .nav-section{
    padding:18px 14px 6px;font-size:10px;
    letter-spacing:.14em;text-transform:uppercase;
    color:var(--t3);font-weight:600;
  }
  .nav-item{
    display:flex;align-items:center;gap:10px;
    padding:9px 12px;border-radius:6px;margin:1px 8px;
    font-size:13px;color:var(--t2);cursor:pointer;
    transition:all .15s;position:relative;
    text-decoration:none;background:transparent;border:none;
    width:calc(100% - 16px);font-family:var(--font-archivo),sans-serif;
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
  .user-av{width:32px;height:32px;border-radius:50%;background:var(--g-dim);border:1px solid rgba(16,185,129,.25);display:flex;align-items:center;justify-content:center;font-family:var(--font-bebas),sans-serif;font-size:13px;color:var(--g);flex-shrink:0;}
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
  .profile-popup-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 14px;background:transparent;border:none;font-family:var(--font-archivo),sans-serif;font-size:13px;color:var(--t2);cursor:pointer;text-align:left;transition:background .12s,color .12s;}
  .profile-popup-item:hover{background:var(--surface);color:var(--t1);}
  .profile-popup-item.danger{color:var(--danger);}
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
      position:fixed;top:0;left:0;right:0;z-index:199;
      height:calc(44px + env(safe-area-inset-top,0px));
      padding:env(safe-area-inset-top,0px) 16px 0;
      background:rgba(15,23,42,0.94);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-bottom:1px solid var(--line);
    }
    html[data-theme="light"] .mob-topbar{background:rgba(248,250,252,0.94);}
    .mob-topbar-logo{
      display:flex;align-items:center;gap:8px;text-decoration:none;
      font-family:var(--font-bebas),sans-serif;font-size:20px;letter-spacing:2px;color:var(--t1);
    }
    .mob-topbar-logo em{color:var(--g);font-style:normal;}
    .mob-topbar-av{
      width:30px;height:30px;border-radius:50%;
      background:var(--g-dim);border:1px solid rgba(16,185,129,.25);
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-bebas),sans-serif;font-size:12px;color:var(--g);
      cursor:pointer;-webkit-tap-highlight-color:transparent;
    }
    .mob-menu-popup{
      display:block;
      position:fixed;top:calc(44px + env(safe-area-inset-top,0px));right:0;width:220px;
      background:var(--bg2);border:1px solid var(--line2);
      border-radius:0 0 10px 10px;
      box-shadow:0 8px 24px rgba(0,0,0,.3);
      z-index:300;
      animation:popupIn .15s ease both;
    }

    /* Sidebar becomes a shell — only the mob-tabbar inside it is visible */
    .sidebar{
      width:100%;height:auto;min-height:auto;
      flex-direction:column;
      border-right:none;border-top:1px solid var(--line);
      position:fixed;bottom:0;left:0;right:0;top:auto;
      z-index:200;
      background:rgba(15,23,42,0.94);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      padding-bottom:env(safe-area-inset-bottom,0px);
    }
    html[data-theme="light"] .sidebar{background:rgba(248,250,252,0.94);}
    .sidebar::before{display:none;}
    .sidebar-logo{display:none;}
    .desk-nav{display:none;}
    .sidebar-footer{display:none;}

    /* Tab bar */
    .mob-tabbar{
      display:flex;flex-direction:row;
      align-items:stretch;height:56px;
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
    .mob-tab.active::before{
      content:'';position:absolute;
      top:0;left:50%;transform:translateX(-50%);
      width:28px;height:2px;
      background:var(--g);border-radius:0 0 3px 3px;
    }
    .mob-tab svg{width:20px;height:20px;transition:stroke .15s;}
    .mob-tab.active svg{stroke:var(--g);}

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
      box-shadow:0 0 0 1px rgba(16,185,129,.3),0 0 18px rgba(16,185,129,.45),0 4px 12px rgba(16,185,129,.25);
      transition:transform .15s,box-shadow .15s;
    }
    .mob-fab:active .mob-fab-inner{
      transform:scale(.91);
      box-shadow:0 0 10px rgba(16,185,129,.25),0 2px 6px rgba(16,185,129,.15);
    }
  }
`

interface Props {
  displayName: string
  userEmail: string
  plan?: string
}

export default function SidebarNav({ displayName, userEmail, plan = 'free' }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  const [mobMenuOpen, setMobMenuOpen] = useState(false)
  const [overdueCt, setOverdueCt] = useState(0)

  useEffect(() => {
    if (!mobMenuOpen) return
    const close = () => setMobMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [mobMenuOpen])

  useEffect(() => {
    fetch('/api/invoices?status=overdue&page=0')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total) setOverdueCt(d.total) })
      .catch(() => {})
  }, [])

  const initials = displayName
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??'

  async function handleLogout() {
    const supa = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supa.auth.signOut()
    router.push('/auth/login')
  }

  function is(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const planLabel = plan === 'business' ? 'Business Plan' : plan === 'pro' ? 'Pro Plan' : 'Free Plan'

  return (
    <>
      <style>{CSS}</style>

      {/* ── MOBILE TOP BAR ── */}
      <div className="mob-topbar">
        <Link href="/dashboard" className="mob-topbar-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
            <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
            <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
            <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
          </svg>
          <span>STAGE<em>PAY</em></span>
        </Link>
        <button
          className="mob-topbar-av"
          onClick={e => { e.stopPropagation(); setMobMenuOpen(p => !p) }}
        >
          {initials}
        </button>
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
          <button className="profile-popup-item" onClick={() => { setMobMenuOpen(false); router.push('/settings') }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
            Edit profile
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
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
              <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
              <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            <span style={{ fontFamily: "var(--font-bebas),sans-serif", fontSize: 26, letterSpacing: 3 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 8px 10px', marginBottom: 2 }} title="Keyboard shortcuts">
            <span style={{ fontSize: 10, color: 'var(--t3)', width: '100%', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Shortcuts</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>N</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>New invoice</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>I</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>Invoices</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>R</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>Reminders</span>
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>
            <span>Home</span>
          </Link>

          {/* Invoices (with overdue badge) */}
          <Link href="/invoices" className={`mob-tab${is('/invoices') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
              <path d="M5 6h6M5 9h4"/>
            </svg>
            {overdueCt > 0 && <span className="mob-overdue">{overdueCt}</span>}
            <span>Invoices</span>
          </Link>

          {/* FAB — New Invoice */}
          <Link href="/new-invoice" className="mob-fab" aria-label="New Invoice">
            <div className="mob-fab-inner">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 3v10M3 8h10"/>
              </svg>
            </div>
          </Link>

          {/* Clients */}
          <Link href="/clients" className={`mob-tab${is('/clients') ? ' active' : ''}`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="5" r="3"/>
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/>
            </svg>
            <span>Clients</span>
          </Link>

          {/* Settings */}
          <Link href="/settings" className={`mob-tab${is('/settings') ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </Link>

        </nav>

      </aside>
    </>
  )
}
