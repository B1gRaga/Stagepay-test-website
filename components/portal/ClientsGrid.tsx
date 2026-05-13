'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

export type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  vat_number: string | null
  notes: string | null
  created_at: string
}

export type ClientStats = { count: number; total: number; currency: string }

const AVATAR_COLOR = '#10B981'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
}

function fmt(n: number, sym: string) {
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}k`
  return `${sym}${Math.round(n)}`
}

const CSS = `
:root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  html[data-theme="light"]{
    --bg:#F1F5F9;--bg2:#FFFFFF;--surface:#E2E8F0;--surface2:#CBD5E1;
    --line:rgba(0,0,0,0.08);--line2:rgba(0,0,0,0.14);
    --t1:#0F172A;--t2:rgba(15,23,42,0.65);--t3:rgba(15,23,42,0.38);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;}
  .btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.4),0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 0 24px rgba(16,185,129,.6),0 4px 16px rgba(16,185,129,.3);}

  .content{padding:24px 28px;}

  .search-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
  .search-wrap{position:relative;flex:1;max-width:380px;}
  .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;}
  .search-input{
    width:100%;background:var(--bg2);border:1px solid var(--line2);border-radius:6px;
    padding:9px 14px 9px 34px;font-family:'Archivo',sans-serif;font-size:13px;
    color:var(--t1);outline:none;transition:border-color .15s;
  }
  .search-input:focus{border-color:rgba(16,185,129,.4);}
  .search-input::placeholder{color:var(--t3);}

  .clients-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .client-card{
    background:var(--bg2);border:1px solid var(--line);
    border-radius:12px;padding:20px;cursor:pointer;
    transition:all .2s;
  }
  .client-card:hover{border-color:rgba(16,185,129,.3);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2);}
  .client-av{
    width:44px;height:44px;border-radius:10px;
    display:flex;align-items:center;justify-content:center;
    font-family:'Bebas Neue',sans-serif;font-size:18px;
    margin-bottom:14px;
  }
  .client-name{font-size:14px;font-weight:600;color:var(--t1);margin-bottom:3px;}
  .client-type{font-size:12px;color:var(--t3);margin-bottom:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .client-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .client-stat{background:var(--surface);border-radius:7px;padding:8px 10px;}
  .client-stat-val{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--t1);}
  .client-stat-label{font-size:10px;color:var(--t3);letter-spacing:.05em;text-transform:uppercase;}
  .client-phone{margin-top:8px;font-size:11px;color:var(--t3);display:flex;align-items:center;gap:4px;}

  .empty-state{text-align:center;padding:64px 20px;}
  .empty-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}
  .empty-title{font-size:16px;color:var(--t1);margin-bottom:6px;}
  .empty-sub{font-size:12px;color:var(--t3);margin-bottom:20px;max-width:320px;margin-left:auto;margin-right:auto;}
  .empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:#0F172A;border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;font-family:'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 0 14px rgba(16,185,129,.4),0 2px 8px rgba(16,185,129,.2);}
  .empty-cta:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 0 24px rgba(16,185,129,.6),0 4px 16px rgba(16,185,129,.3);}

  @media(max-width:900px){.clients-grid{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:600px){
    .clients-grid{grid-template-columns:1fr;gap:10px;}
    .client-card{padding:14px;}
    .client-av{width:36px;height:36px;font-size:14px;margin-bottom:10px;}
    .client-name{font-size:13px;}
    .content{padding:16px;}
    .topbar{padding:0 16px;}
  }
`

export default function ClientsGrid({
  clients,
  statsMap,
}: {
  clients: Client[]
  statsMap: Record<string, ClientStats>
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  }, [clients, search])

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="page-title">CLIENTS</div>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            Add Client
          </Link>
        </div>
      </div>

      <div className="content">
        <div className="search-bar">
          <div className="search-wrap">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="#10B981" strokeWidth="1.8">
                <circle cx="14" cy="8" r="5"/><path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10"/>
              </svg>
            </div>
            <div className="empty-title">{search ? 'No matches' : 'No clients yet'}</div>
            <div className="empty-sub">
              {search
                ? `No clients match "${search}".`
                : 'Add your first client for faster invoicing.'}
            </div>
            {!search && (
              <Link href="/new-invoice" className="empty-cta">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
                Add client
              </Link>
            )}
          </div>
        ) : (
          <div className="clients-grid">
            {filtered.map((c) => {
              const color = AVATAR_COLOR
              const ini   = initials(c.name)
              const stats = statsMap[c.id] ?? { count: 0, total: 0, currency: 'P' }
              const sym   = stats.currency || 'P'
              return (
                <div key={c.id} className="client-card" style={{ color: 'inherit' }}>
                  <div className="client-av" style={{ background: `${color}18`, color }}>{ini}</div>
                  <div className="client-name">{c.name}</div>
                  <div className="client-type">{c.email || c.phone || '—'}</div>
                  <div className="client-stats">
                    <div className="client-stat">
                      <div className="client-stat-val">{stats.count}</div>
                      <div className="client-stat-label">Invoices</div>
                    </div>
                    <div className="client-stat">
                      <div className="client-stat-val" style={{ fontSize: 14 }}>{fmt(stats.total, sym)}</div>
                      <div className="client-stat-label">Total billed</div>
                    </div>
                  </div>
                  {c.phone && (
                    <div className="client-phone">
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="#25D366">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/>
                      </svg>
                      {c.phone}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
