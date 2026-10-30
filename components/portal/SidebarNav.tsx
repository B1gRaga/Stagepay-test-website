'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'
import ThemeToggleBtn from './ThemeToggleBtn'
import { openSupport } from './SupportBtn'
import { LogoFull } from '@/components/Logo'

const CSS = `
  :root{
    --g:#F2A900;--g2:#C98C00;--g-dim:rgba(242,169,0,0.1);--g-glow:rgba(242,169,0,0.2);
    --bg:#18213A;--bg2:#1F2A44;--bg3:#18213A;--surface:#1F2A44;--surface2:#2B3756;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#FAF7F0;--t2:rgba(250,247,240,.74);--t3:rgba(250,247,240,.56);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
    /* nav frame only */
    --nav-bg:#131B30;--nav-hover:rgba(250,247,240,.05);--nav-on:rgba(250,247,240,.08);
    --nav-t:rgba(250,247,240,.7);--nav-icon:rgba(250,247,240,.55);--nav-late:#F2967A;
  }
  html[data-theme="light"]{
    --bg:#FAF7F0;--bg2:#ffffff;--surface:#F1ECE1;--surface2:#E4DDCF;
    --line:rgba(31,42,68,.08);--line2:rgba(31,42,68,.14);
    --t1:#1F2A44;--t2:rgba(31,42,68,.74);--t3:rgba(31,42,68,.67);
    --g-dim:rgba(242,169,0,.12);
    --nav-bg:#F3EEE4;--nav-hover:rgba(31,42,68,.04);--nav-on:#FFFFFF;
    --nav-t:#3F4759;--nav-icon:#5C6476;--nav-late:#B0442A;
  }

  /* ── DESKTOP SIDEBAR ── */
  .sidebar{
    width:236px;flex-shrink:0;
    background:var(--nav-bg);
    border-right:1px solid var(--line);
    display:flex;flex-direction:column;
    height:100vh;position:relative;
    padding:18px 12px 12px;
  }
  .sb-top{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 0 8px;margin-bottom:22px}
  .sidebar-logo{display:block;color:var(--t1);border-radius:6px}
  .sidebar-logo svg{height:28px;width:auto;display:block}
  .sidebar-logo:focus-visible{outline:2px solid var(--g);outline-offset:4px}

  .sb-new{
    display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;margin-bottom:18px;
    background:var(--g);color:#1F2A44;border-radius:10px;text-decoration:none;
    font:700 14px var(--font-manrope),sans-serif;
    box-shadow:inset 0 -2px 0 rgba(0,0,0,.08);
    transition:background .15s,transform .1s;
  }
  .sb-new:hover{background:#FFB81A}
  .sb-new:active{transform:translateY(1px)}
  .sb-new svg{width:16px;height:16px;flex:none}
  .sb-new:focus-visible{outline:2px solid var(--t1);outline-offset:2px}

  .desk-nav{display:flex;flex-direction:column;gap:2px;flex:1;overflow-y:auto;scrollbar-width:none;}
  .desk-nav::-webkit-scrollbar{display:none;}
  .desk-nav .push{margin-top:auto}
  .nav-item{
    display:flex;align-items:center;gap:12px;
    height:38px;padding:0 10px;border-radius:9px;
    font:600 14px var(--font-manrope),sans-serif;color:var(--nav-t);
    text-decoration:none;background:transparent;border:0;width:100%;cursor:pointer;text-align:left;
    transition:background .15s,color .15s;
  }
  .nav-item:hover{background:var(--nav-hover);color:var(--t1)}
  .nav-item:focus-visible{outline:2px solid var(--g);outline-offset:-2px}
  .nav-item.active{background:var(--nav-on);color:var(--t1);font-weight:700;box-shadow:0 0 0 1px rgba(31,42,68,.07),0 1px 3px rgba(31,42,68,.08)}
  html:not([data-theme="light"]) .nav-item.active{box-shadow:inset 0 0 0 1px rgba(250,247,240,.06)}
  .nav-icon{width:18px;height:18px;flex-shrink:0;color:var(--nav-icon);transition:color .15s}
  .nav-item:hover .nav-icon{color:var(--t1)}
  .nav-item.active .nav-icon{color:var(--g2)}
  html:not([data-theme="light"]) .nav-item.active .nav-icon{color:var(--g)}
  .nav-late{margin-left:auto;font-size:12px;font-weight:700;color:var(--nav-late);white-space:nowrap}

  .sb-month{display:flex;flex-direction:column;gap:6px;margin:22px 0 0;padding:14px 12px;border-radius:12px;border:1px solid var(--line);text-decoration:none;font-family:var(--font-manrope),sans-serif;transition:background .15s,border-color .15s}
  .sb-month:hover{background:var(--nav-hover);border-color:var(--line2)}
  .sb-month:focus-visible{outline:2px solid var(--g);outline-offset:-2px}
  .sb-month-label{font-size:12px;font-weight:600;color:var(--t3)}
  .sb-month-paid{font-size:18px;font-weight:800;color:var(--t1);letter-spacing:-.01em;font-variant-numeric:tabular-nums}
  .sb-month-paid small{font-size:12px;font-weight:600;color:var(--t2);letter-spacing:0}
  .sb-month-bar{height:4px;border-radius:4px;background:var(--line2);overflow:hidden}
  .sb-month-bar i{display:block;height:100%;border-radius:4px;background:var(--g)}
  .sb-month-of{font-size:12px;font-weight:600;color:var(--t2);font-variant-numeric:tabular-nums}

  .sidebar-footer{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);position:relative}
  .user-pill{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;cursor:pointer;background:transparent;border:0;text-align:left;transition:background .15s;font-family:var(--font-manrope),sans-serif}
  .user-pill:hover,.user-pill[aria-expanded="true"]{background:var(--nav-hover)}
  .user-pill:focus-visible{outline:2px solid var(--g);outline-offset:-2px}
  .user-av{width:32px;height:32px;border-radius:8px;background:#1F2A44;color:#F2A900;display:flex;align-items:center;justify-content:center;font-family:var(--font-manrope),sans-serif;font-weight:800;font-size:12px;letter-spacing:.02em;flex-shrink:0}
  html:not([data-theme="light"]) .user-av{background:#2B3756}
  .user-name{font-size:13px;color:var(--t1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .user-plan{font-size:12px;color:var(--t3);font-weight:600}
  .user-chev{width:14px;height:14px;color:var(--t3);flex-shrink:0;margin-left:auto}

  .profile-popup{
    position:absolute;bottom:calc(100% + 8px);left:0;right:0;
    background:var(--bg2);border:1px solid var(--line2);border-radius:12px;
    box-shadow:0 12px 32px rgba(0,0,0,.22);overflow:hidden;z-index:200;padding:4px;
    animation:popupIn .15s ease both;
  }
  @keyframes popupIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .profile-popup-header{display:flex;align-items:center;gap:10px;padding:10px 10px 12px;}
  .profile-popup-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:8px;background:transparent;border:none;font-family:var(--font-manrope),sans-serif;font-weight:600;font-size:13px;color:var(--t2);cursor:pointer;text-align:left;text-decoration:none;transition:background .12s,color .12s;}
  .profile-popup-item:hover{background:var(--surface);color:var(--t1);}
  .profile-popup-item svg{width:15px;height:15px;flex:none}
  .profile-popup-item.danger{color:var(--danger);}
  .profile-popup-item.danger:hover{background:rgba(224,85,64,.08);color:var(--danger);}
  .profile-popup-divider{height:1px;background:var(--line);margin:4px 6px;}
  .biz-switch{padding:2px 0 0;}
  .biz-label{padding:6px 10px 4px;font-size:11px;font-weight:700;color:var(--t3);}
  .biz-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;font:600 13px var(--font-manrope),sans-serif;color:var(--t2);cursor:pointer;text-align:left;}
  .biz-item:hover:not(:disabled){background:var(--surface);color:var(--t1);}
  .biz-item[aria-current="true"]{color:var(--t1);background:var(--surface);}
  .biz-item:disabled{opacity:.55;cursor:default;}
  .biz-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .biz-role{flex:none;font-size:11px;font-weight:600;color:var(--t3);}
  .biz-error{padding:4px 10px 8px;font-size:12px;color:var(--danger);}

  /* The theme button sits quietly beside the logo */
  .sb-top .theme-toggle-btn,.mob-topbar .theme-toggle-btn{border:0 !important;color:var(--nav-icon) !important;width:32px !important;height:32px !important}
  .sb-top .theme-toggle-btn:hover,.mob-topbar .theme-toggle-btn:hover{background:var(--nav-hover) !important;color:var(--t1) !important}

  /* ── MOBILE ── */
  .mob-topbar{display:none;}
  .mob-menu-popup{display:none;}
  .mob-tabbar{display:none;}

  @media(max-width:768px){
    .mob-topbar{
      display:flex;align-items:center;justify-content:space-between;
      position:fixed;top:0;left:0;right:0;z-index:999;
      height:calc(44px + env(safe-area-inset-top,0px));
      padding:env(safe-area-inset-top,0px) 12px 0 16px;
      background:color-mix(in srgb,var(--bg) 90%,transparent);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
      border-bottom:1px solid var(--line);
    }
    .mob-topbar-logo{display:flex;align-items:center;text-decoration:none;color:var(--t1);}
    .mob-topbar-logo svg{height:22px;width:auto;display:block;}
    .mob-topbar-av{
      width:30px;height:30px;border-radius:8px;border:0;padding:0;
      background:#1F2A44;color:#F2A900;
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-manrope),sans-serif;font-weight:800;font-size:11px;
      cursor:pointer;-webkit-tap-highlight-color:transparent;
    }
    html:not([data-theme="light"]) .mob-topbar-av{background:#2B3756}
    .mob-menu-popup{
      display:block;
      position:fixed;top:calc(50px + env(safe-area-inset-top,0px));right:8px;width:250px;
      background:var(--bg2);border:1px solid var(--line2);border-radius:12px;padding:4px;
      box-shadow:0 12px 32px rgba(0,0,0,.25);
      z-index:1001;
      animation:popupIn .15s ease both;
    }

    /* Sidebar becomes a shell; only the tab bar inside it shows */
    .sidebar{
      width:100%;height:auto;padding:0 6px env(safe-area-inset-bottom,0px);
      flex-direction:column;
      border-right:none;border-top:1px solid var(--line);
      position:fixed;bottom:0;left:0;right:0;top:auto;
      z-index:1000;
      background:color-mix(in srgb,var(--bg) 94%,transparent);
      backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    }
    .sb-top,.sb-new,.desk-nav,.sidebar-footer{display:none;}

    /* reset what globals.css nav{} sets */
    .mob-tabbar{
      display:flex;flex-direction:row;align-items:stretch;height:58px;
      background:transparent;position:static;padding:0;border:none;
      backdrop-filter:none;-webkit-backdrop-filter:none;
    }
    .mob-tab{
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      flex:1;gap:4px;
      font:600 10.5px var(--font-manrope),sans-serif;
      color:var(--nav-icon);text-decoration:none;
      position:relative;cursor:pointer;background:transparent;border:none;padding:0;
      transition:color .15s;-webkit-tap-highlight-color:transparent;
    }
    .mob-tab.active{color:var(--t1);font-weight:700}
    .mob-tab.active::before{
      content:'';position:absolute;top:-1px;left:50%;transform:translateX(-50%);
      width:22px;height:3px;background:var(--g);border-radius:0 0 3px 3px;
    }
    .mob-tab svg{width:21px;height:21px;}
    .mob-overdue{
      position:absolute;top:6px;left:calc(50% + 5px);
      background:var(--nav-late);color:#fff;
      font-size:9.5px;font-weight:800;
      padding:0 5px;border-radius:999px;min-width:16px;height:16px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 0 2px var(--bg);pointer-events:none;
    }
    html:not([data-theme="light"]) .mob-overdue{color:#1F2A44}

    .mob-fab{display:flex;flex:1;align-items:center;justify-content:center;height:58px;text-decoration:none;-webkit-tap-highlight-color:transparent;}
    .mob-fab-inner{
      width:48px;height:40px;background:var(--g);border-radius:12px;
      display:flex;align-items:center;justify-content:center;color:#1F2A44;
      box-shadow:inset 0 -2px 0 rgba(0,0,0,.1);
      transition:transform .12s;
    }
    .mob-fab-inner svg{width:20px;height:20px}
    .mob-fab:active .mob-fab-inner{transform:scale(.94)}
  }
`

const ICONS = {
  home: <><path d="M3.5 8.5 10 3.5l6.5 5V16a.5.5 0 0 1-.5.5h-3.5v-4.5h-5v4.5H4a.5.5 0 0 1-.5-.5z"/></>,
  invoices: <><path d="M5 2.5h7l3 3v12H5z"/><path d="M12 2.5v3h3M7.5 9.5h5M7.5 12.5h5M7.5 15.5h3"/></>,
  clients: <><circle cx="8" cy="7" r="3"/><path d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M13 4.2a3 3 0 0 1 0 5.6M15.5 12.5c1.3.7 2 2.3 2 4.5"/></>,
  reminders: <><path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5v3l1.5 3H3l1.5-3V8A5.5 5.5 0 0 1 10 2.5z"/><path d="M8 16.5a2 2 0 0 0 4 0"/></>,
  start: <><path d="M3.5 10.5 7.5 14.5 16.5 5.5"/></>,
  help: <><circle cx="10" cy="10" r="7.5"/><path d="M7.8 7.8a2.3 2.3 0 1 1 3 2.2c-.5.2-.8.6-.8 1.1v.6"/><circle cx="10" cy="14.2" r=".4" fill="currentColor"/></>,
  // Cog drawn on a 24 grid, scaled to 20; the stroke is bumped so it matches the others
  settings: <g transform="scale(.8333)" strokeWidth="1.92"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>,
  plus: <><path d="M10 4v12M4 10h12"/></>,
  logout: <><path d="M8 3.5H4.5v13H8M12.5 6.5 16 10l-3.5 3.5M16 10H8"/></>,
  chev: <><path d="M6 8l4-4 4 4M6 12l4 4 4-4"/></>,
}
function Icon({ name, className = 'nav-icon', strokeWidth = 1.6 }: { name: keyof typeof ICONS; className?: string; strokeWidth?: number }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
}

const money = (n: number, sym: string) => `${sym}${Math.round(n).toLocaleString('en')}`

type Business = { accountId: string; name: string; role: 'owner' | 'admin' | 'staff'; paused: boolean }

interface Props {
  displayName: string
  userEmail: string
  plan?: string
  overdueCt?: number
  // Money on invoices issued this month, in the main currency
  month?: { sym: string; invoiced: number; paid: number }
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

export default function SidebarNav({ displayName, userEmail, plan = 'free', overdueCt = 0, month, businesses = [], currentAccountId, role = 'owner' }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  const [mobMenuOpen, setMobMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobMenuOpen && !popupOpen) return
    const close = () => { setMobMenuOpen(false); setPopupOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey) }
  }, [mobMenuOpen, popupOpen])

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
  const cur = (path: string) => (is(path) ? 'page' : undefined)

  // In a team business, the role says more than the owner's plan does.
  const planLabel = role !== 'owner' ? ROLE_NAME[role] : plan === 'business' ? 'Business plan' : plan === 'pro' ? 'Pro plan' : 'Free plan'
  const showSwitcher = businesses.length > 1

  // Shared by the desktop popup and the phone menu.
  function accountMenu(close: () => void, phone = false) {
    return (
      <>
        <div className="profile-popup-header">
          <div className="user-av">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{displayName}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
          </div>
        </div>
        <div className="profile-popup-divider"/>
        {showSwitcher && <BusinessSwitcher businesses={businesses} current={currentAccountId} onDone={close} />}
        {phone && (
          <>
            <Link href="/tutorial" className="profile-popup-item" onClick={close}><Icon name="start" className="" />Getting started</Link>
            <button type="button" className="profile-popup-item" onClick={() => { close(); openSupport() }}><Icon name="help" className="" />Help &amp; support</button>
          </>
        )}
        <Link href="/settings" className="profile-popup-item" onClick={close}><Icon name="settings" className="" />{phone ? 'Settings' : 'Account settings'}</Link>
        <div className="profile-popup-divider"/>
        <button type="button" className="profile-popup-item danger" onClick={() => { close(); handleLogout() }}><Icon name="logout" className="" />Log out</button>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── MOBILE TOP BAR ── */}
      <div className="mob-topbar">
        <Link href="/dashboard" className="mob-topbar-logo" aria-label="StagePay dashboard">
          <LogoFull />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThemeToggleBtn />
          <button type="button" className="mob-topbar-av" aria-label="Account menu" aria-expanded={mobMenuOpen}
            onClick={e => { e.stopPropagation(); setMobMenuOpen(p => !p) }}>
            {initials}
          </button>
        </div>
      </div>

      {mobMenuOpen && (
        <div className="mob-menu-popup" onClick={e => e.stopPropagation()}>
          {accountMenu(() => setMobMenuOpen(false), true)}
        </div>
      )}

      <aside className="sidebar">

        {/* ── DESKTOP SIDEBAR ── */}
        <div className="sb-top">
          <Link href="/dashboard" className="sidebar-logo" aria-label="StagePay dashboard">
            <LogoFull />
          </Link>
          <ThemeToggleBtn />
        </div>

        <Link href="/new-invoice" className="sb-new" aria-current={cur('/new-invoice')}>
          <Icon name="plus" className="" strokeWidth={2.2} />
          New invoice
        </Link>

        <nav className="desk-nav" aria-label="Main">
          <Link href="/dashboard" className={`nav-item${is('/dashboard') ? ' active' : ''}`} aria-current={cur('/dashboard')}>
            <Icon name="home" />Dashboard
          </Link>
          <Link href="/invoices" className={`nav-item${is('/invoices') ? ' active' : ''}`} aria-current={cur('/invoices')}>
            <Icon name="invoices" />Invoices
            {overdueCt > 0 && <span className="nav-late">{overdueCt} late</span>}
          </Link>
          <Link href="/clients" className={`nav-item${is('/clients') ? ' active' : ''}`} aria-current={cur('/clients')}>
            <Icon name="clients" />Clients
          </Link>
          <Link href="/reminders" className={`nav-item${is('/reminders') ? ' active' : ''}`} aria-current={cur('/reminders')}>
            <Icon name="reminders" />Reminders
          </Link>

          {month && (
            <Link href="/dashboard" className="sb-month">
              <span className="sb-month-label">This month</span>
              {month.invoiced > 0 ? (
                <>
                  <span className="sb-month-paid">{money(month.paid, month.sym)} <small>collected</small></span>
                  <span className="sb-month-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (month.paid / month.invoiced) * 100)}%` }} /></span>
                  <span className="sb-month-of">
                    {month.paid >= month.invoiced ? 'Everything invoiced is paid' : `${money(month.invoiced - month.paid, month.sym)} still to come`}
                  </span>
                </>
              ) : (
                <span className="sb-month-of">Nothing invoiced yet</span>
              )}
            </Link>
          )}

          <Link href="/tutorial" className={`nav-item push${is('/tutorial') ? ' active' : ''}`} aria-current={cur('/tutorial')}>
            <Icon name="start" />Getting started
          </Link>
          <button type="button" className="nav-item" onClick={openSupport}>
            <Icon name="help" />Help &amp; support
          </button>
          <Link href="/settings" className={`nav-item${is('/settings') ? ' active' : ''}`} aria-current={cur('/settings')}>
            <Icon name="settings" />Settings
          </Link>
        </nav>

        <div className="sidebar-footer" onClick={e => e.stopPropagation()}>
          {popupOpen && (
            <div className="profile-popup">
              {accountMenu(() => setPopupOpen(false))}
            </div>
          )}
          <button type="button" className="user-pill" aria-haspopup="true" aria-expanded={popupOpen} onClick={() => setPopupOpen(p => !p)}>
            <div className="user-av">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{displayName}</div>
              <div className="user-plan">{planLabel}</div>
            </div>
            <Icon name="chev" className="user-chev" />
          </button>
        </div>

        {/* ── MOBILE BOTTOM TAB BAR ── */}
        <nav className="mob-tabbar" aria-label="Main">
          <Link href="/dashboard" className={`mob-tab${is('/dashboard') ? ' active' : ''}`} aria-current={cur('/dashboard')}>
            <Icon name="home" className="" />
            <span>Home</span>
          </Link>
          <Link href="/invoices" className={`mob-tab${is('/invoices') ? ' active' : ''}`} aria-current={cur('/invoices')}>
            <Icon name="invoices" className="" />
            {overdueCt > 0 && <span className="mob-overdue" aria-label={`${overdueCt} late`}>{overdueCt}</span>}
            <span>Invoices</span>
          </Link>
          <Link href="/new-invoice" className="mob-fab" aria-label="New invoice">
            <span className="mob-fab-inner"><Icon name="plus" className="" strokeWidth={2.4} /></span>
          </Link>
          <Link href="/clients" className={`mob-tab${is('/clients') ? ' active' : ''}`} aria-current={cur('/clients')}>
            <Icon name="clients" className="" />
            <span>Clients</span>
          </Link>
          <Link href="/reminders" className={`mob-tab${is('/reminders') ? ' active' : ''}`} aria-current={cur('/reminders')}>
            <Icon name="reminders" className="" />
            <span>Reminders</span>
          </Link>
        </nav>

      </aside>
    </>
  )
}
