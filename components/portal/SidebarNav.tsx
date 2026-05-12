'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

const NAV_MAIN = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
  },
  {
    key: 'new-invoice',
    href: '/new-invoice',
    label: 'New Invoice',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>,
  },
  {
    key: 'invoices',
    href: '/invoices',
    label: 'Invoices',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 6h6M5 9h4"/></svg>,
    badgeId: 'overdue-badge',
  },
  {
    key: 'clients',
    href: '/clients',
    label: 'Clients',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/></svg>,
  },
  {
    key: 'reminders',
    href: '/reminders',
    label: 'Reminders',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/><path d="M6.5 13a1.5 1.5 0 003 0"/></svg>,
  },
  {
    key: 'tutorial',
    href: '/tutorial',
    label: 'Getting Started',
    icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 5v4"/><circle cx="8" cy="11" r=".5" fill="currentColor"/></svg>,
  },
]

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
  .theme-btn{
    display:flex;align-items:center;justify-content:center;gap:6px;
    width:100%;padding:7px 12px;border-radius:6px;border:1px solid var(--line2);
    background:transparent;color:var(--t3);cursor:pointer;font-size:11px;font-weight:600;
    font-family:'Archivo',sans-serif;letter-spacing:.05em;text-transform:uppercase;
    transition:all .15s;margin-bottom:8px;
  }
  .theme-btn:hover{border-color:var(--g);color:var(--g);}

  .sidebar{
    width:224px;flex-shrink:0;
    background:var(--bg2);
    border-right:1px solid var(--line);
    display:flex;flex-direction:column;
    height:100vh;
    position:relative;
  }
  .sidebar::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,var(--g) 0%,transparent 60%);
    opacity:.7;z-index:1;
  }
  .sidebar-logo{
    padding:22px 20px 16px;
    border-bottom:1px solid var(--line);
    font-family:'Bebas Neue',sans-serif;
    font-size:23px;letter-spacing:3px;color:var(--t1);
  }
  .sidebar-logo em{color:var(--g);font-style:normal;}
  .sidebar-logo small{
    display:block;font-family:'Archivo',sans-serif;
    font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--t3);font-weight:500;margin-top:2px;
  }
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
    text-decoration:none;background:transparent;border:none;width:calc(100% - 16px);
    font-family:'Archivo',sans-serif;
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
  .user-av{width:32px;height:32px;border-radius:50%;background:var(--g-dim);border:1px solid rgba(16,185,129,.25);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:13px;color:var(--g);flex-shrink:0;}
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
  .profile-popup-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 14px;background:transparent;border:none;font-family:'Archivo',sans-serif;font-size:13px;color:var(--t2);cursor:pointer;text-align:left;transition:background .12s,color .12s;}
  .profile-popup-item:hover{background:var(--surface);color:var(--t1);}
  .profile-popup-item.danger{color:var(--danger);}
  .profile-popup-item.danger:hover{background:rgba(224,85,64,.08);color:var(--danger);}
  .profile-popup-divider{height:1px;background:var(--line);margin:2px 0;}

  @media(max-width:768px){
    .sidebar{width:100%;min-height:auto;height:auto;flex-direction:row;border-right:none;border-bottom:1px solid var(--line);position:fixed;bottom:0;top:auto;z-index:100;overflow:visible;}
    .sidebar-logo{display:none;}
    .sp-nav-mob{display:flex;flex-direction:row;padding:6px;flex:1;overflow-x:auto;}
    .nav-item{flex-direction:column;gap:3px;padding:6px 12px;font-size:10px;min-width:64px;justify-content:center;align-items:center;border-radius:8px;margin:0;}
    .nav-item span.nav-label{display:block;}
    .sidebar-footer{display:none;}
  }
`

interface Props {
  displayName: string
  userEmail: string
  plan?: string
}

export default function SidebarNav({ displayName, userEmail, plan = 'free' }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  // Reads the data-theme already set by the layout init script (no flash)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return document.documentElement.getAttribute('data-theme') !== 'light'
  })

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try { localStorage.setItem('stagepay-theme', next) } catch {}
  }

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

  return (
    <>
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
              <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
              <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 3 }}>
              Stage<em>Pay</em>
            </span>
          </div>
          <small>Professional invoicing</small>
        </div>

        <div className="sp-nav-mob" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="nav-section">Main</div>
          {NAV_MAIN.map(({ key, href, label, icon }) => (
            <Link
              key={key}
              href={href}
              className={`nav-item${pathname === '/' + key || (key === 'dashboard' && pathname === '/dashboard') ? ' active' : ''}`}
            >
              {icon}
              <span className="nav-label">{label}</span>
            </Link>
          ))}

          <div className="nav-section">Account</div>
          <Link
            href="/settings"
            className={`nav-item${pathname === '/settings' ? ' active' : ''}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span className="nav-label">Settings</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          {/* Keyboard shortcuts strip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 8px 10px', marginBottom: 2 }} title="Keyboard shortcuts">
            <span style={{ fontSize: 10, color: 'var(--t3)', width: '100%', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Shortcuts</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>N</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>New invoice</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>I</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>Invoices</span>
            <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 4, padding: '2px 6px', color: 'var(--t3)' }}>R</kbd>
            <span style={{ fontSize: 10, color: 'var(--t3)', marginRight: 6 }}>Reminders</span>
          </div>

          {/* Theme toggle */}
          <button className="theme-btn" onClick={toggleTheme}>
            {isDark ? (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/></svg>
                Light mode
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"/></svg>
                Dark mode
              </>
            )}
          </button>

          {/* User pill */}
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
              <div className="user-plan">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--t3)', flexShrink: 0 }}><circle cx="8" cy="4" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="8" cy="12" r="1"/></svg>
          </div>
        </div>
      </aside>
    </>
  )
}
