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

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
}

function fmt(n: number, sym: string) {
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}k`
  return `${sym}${Math.round(n).toLocaleString()}`
}

const AVATAR_COLORS = [
  { bg: 'rgba(16,185,129,.15)',  border: 'rgba(16,185,129,.3)',  text: '#10B981' },
  { bg: 'rgba(59,130,246,.15)',  border: 'rgba(59,130,246,.3)',  text: '#60A5FA' },
  { bg: 'rgba(245,158,11,.15)',  border: 'rgba(245,158,11,.3)',  text: '#FBBF24' },
  { bg: 'rgba(168,85,247,.15)',  border: 'rgba(168,85,247,.3)',  text: '#C084FC' },
  { bg: 'rgba(239,68,68,.15)',   border: 'rgba(239,68,68,.3)',   text: '#F87171' },
  { bg: 'rgba(20,184,166,.15)',  border: 'rgba(20,184,166,.3)',  text: '#2DD4BF' },
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const CSS = `
:root{
  --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
  --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
  --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
  --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
  --danger:#EF4444;--warn:#F59E0B;
}
html[data-theme="light"]{
  --bg:#F1F5F9;--bg2:#FFFFFF;--surface:#E2E8F0;--surface2:#CBD5E1;
  --line:rgba(0,0,0,0.08);--line2:rgba(0,0,0,0.14);
  --t1:#0F172A;--t2:rgba(15,23,42,0.65);--t3:rgba(15,23,42,0.38);
  --g-dim:rgba(16,185,129,0.08);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}

/* Topbar */
.topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
.page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
.topbar-right{display:flex;align-items:center;gap:10px;}
.topbar-btn{display:flex;align-items:center;gap:7px;padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;}
.btn-primary{background:var(--g);color:#0F172A;box-shadow:0 0 14px rgba(16,185,129,.35);}
.btn-primary:hover{background:#34d399;transform:translateY(-1px);}

/* Content */
.content{padding:20px 28px;}

/* Toolbar */
.toolbar{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.search-wrap{position:relative;flex:1;min-width:200px;max-width:380px;}
.search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;}
.search-input{width:100%;background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:9px 14px 9px 34px;font-family:'Archivo',sans-serif;font-size:13px;color:var(--t1);outline:none;transition:border-color .15s;}
.search-input:focus{border-color:rgba(16,185,129,.4);}
.search-input::placeholder{color:var(--t3);}
.toolbar-right{display:flex;align-items:center;gap:8px;margin-left:auto;}
.view-toggle{display:flex;background:var(--bg2);border:1px solid var(--line2);border-radius:7px;overflow:hidden;}
.view-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;color:var(--t3);cursor:pointer;transition:all .15s;}
.view-btn.active{background:var(--g-dim);color:var(--g);}
.view-btn:hover:not(.active){color:var(--t2);}
.count-badge{font-size:12px;color:var(--t3);white-space:nowrap;}

/* ── GRID VIEW ── */
.clients-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
@media(max-width:1100px){.clients-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:640px){.clients-grid{grid-template-columns:1fr;}}

.client-card{
  background:var(--bg2);border:1px solid var(--line);border-radius:14px;
  padding:22px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;
}
.client-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  opacity:0;transition:opacity .2s;
}
.client-card:hover{border-color:rgba(16,185,129,.25);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2);}
.client-card:hover::before{opacity:1;}

.card-top{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px;}
.card-av{
  width:46px;height:46px;border-radius:12px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:1px;
  border:1px solid transparent;
}
.card-info{flex:1;min-width:0;}
.card-name{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.card-contact{font-size:12px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

.card-divider{height:1px;background:var(--line);margin-bottom:14px;}

.card-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.card-stat{background:var(--surface);border-radius:8px;padding:10px 12px;}
.card-stat-val{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--t1);line-height:1;}
.card-stat-label{font-size:10px;color:var(--t3);letter-spacing:.06em;text-transform:uppercase;margin-top:3px;}

.card-footer{margin-top:14px;display:flex;align-items:center;gap:6px;}
.card-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--t3);background:var(--surface);border-radius:4px;padding:3px 8px;}

/* ── LIST VIEW ── */
.clients-list{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.list-head{
  display:grid;grid-template-columns:44px 1fr 160px 100px 120px 36px;
  gap:12px;padding:10px 20px;
  border-bottom:1px solid var(--line);background:var(--surface);
}
.list-th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
.list-row{
  display:grid;grid-template-columns:44px 1fr 160px 100px 120px 36px;
  gap:12px;padding:13px 20px;border-bottom:1px solid var(--line);
  align-items:center;cursor:pointer;transition:background .12s;
}
.list-row:last-child{border-bottom:none;}
.list-row:hover{background:var(--surface);}
.list-av{
  width:36px;height:36px;border-radius:9px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.5px;
  border:1px solid transparent;
}
.list-name{font-size:13px;font-weight:600;color:var(--t1);}
.list-contact{font-size:11px;color:var(--t3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.list-td{font-size:13px;color:var(--t2);}
.list-amt{font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--t1);}
.list-inv-count{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:26px;height:22px;border-radius:6px;
  font-size:12px;font-weight:700;
  background:var(--g-dim);color:var(--g);border:1px solid rgba(16,185,129,.2);
  padding:0 6px;
}
.list-wa{width:28px;height:28px;border-radius:7px;background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;text-decoration:none;}
.list-wa:hover{background:rgba(37,211,102,.2);}

/* Empty */
.empty-state{text-align:center;padding:72px 20px;}
.empty-icon{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
.empty-title{font-size:17px;font-weight:600;color:var(--t1);margin-bottom:8px;}
.empty-sub{font-size:13px;color:var(--t3);margin-bottom:22px;max-width:300px;margin-left:auto;margin-right:auto;line-height:1.6;}
.empty-cta{display:inline-flex;align-items:center;gap:7px;background:var(--g);color:#0F172A;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;font-family:'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 0 14px rgba(16,185,129,.35);}
.empty-cta:hover{background:#34d399;}

@media(max-width:700px){
  .list-head,.list-row{grid-template-columns:36px 1fr 90px 36px;}
  .list-head>*:nth-child(3),.list-row>*:nth-child(3),
  .list-head>*:nth-child(5),.list-row>*:nth-child(5){display:none;}
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
  const [view, setView]     = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const totalBilled = useMemo(() =>
    clients.reduce((s, c) => s + (statsMap[c.id]?.total || 0), 0), [clients, statsMap])

  const topCurrency = clients[0] ? (statsMap[clients[0].id]?.currency || 'P') : 'P'

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <div className="page-title">CLIENTS</div>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
            New Invoice
          </Link>
        </div>
      </div>

      <div className="content">

        {/* Summary strip */}
        {clients.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Clients',   val: clients.length, mono: true },
              { label: 'Total Billed',    val: fmt(totalBilled, topCurrency), mono: true },
              { label: 'Avg per Client',  val: clients.length ? fmt(totalBilled / clients.length, topCurrency) : '—', mono: true },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: 'var(--t1)', letterSpacing: 1 }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
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
          <div className="toolbar-right">
            <span className="count-badge">{filtered.length} client{filtered.length !== 1 ? 's' : ''}</span>
            <div className="view-toggle">
              <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
              </button>
              <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 4h10M3 8h10M3 12h10"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#10B981" strokeWidth="1.8">
                <circle cx="14" cy="8" r="5"/><path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10"/>
              </svg>
            </div>
            <div className="empty-title">{search ? 'No matches' : 'No clients yet'}</div>
            <div className="empty-sub">
              {search ? `No clients match "${search}".` : 'Clients are added automatically when you save an invoice.'}
            </div>
            {!search && (
              <Link href="/new-invoice" className="empty-cta">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
                Create First Invoice
              </Link>
            )}
          </div>

        ) : view === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="clients-grid">
            {filtered.map((c) => {
              const col   = avatarColor(c.name)
              const ini   = initials(c.name)
              const stats = statsMap[c.id] ?? { count: 0, total: 0, currency: 'P' }
              const sym   = stats.currency || 'P'
              return (
                <div key={c.id} className="client-card">
                  <div className="client-card" style={{ display: 'contents' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${col.text},transparent 70%)`, opacity: 0.6 }}/>
                  </div>
                  <div className="card-top">
                    <div className="card-av" style={{ background: col.bg, borderColor: col.border, color: col.text }}>{ini}</div>
                    <div className="card-info">
                      <div className="card-name">{c.name}</div>
                      <div className="card-contact">{c.email || c.phone || '—'}</div>
                    </div>
                  </div>

                  <div className="card-divider"/>

                  <div className="card-stats">
                    <div className="card-stat">
                      <div className="card-stat-val">{stats.count}</div>
                      <div className="card-stat-label">Invoices</div>
                    </div>
                    <div className="card-stat">
                      <div className="card-stat-val" style={{ fontSize: stats.total >= 10000 ? 18 : 22 }}>{fmt(stats.total, sym)}</div>
                      <div className="card-stat-label">Total Billed</div>
                    </div>
                  </div>

                  {(c.phone || c.address) && (
                    <div className="card-footer">
                      {c.phone && (
                        <a
                          href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                          target="_blank" rel="noreferrer"
                          className="card-tag"
                          style={{ color: '#25D366', background: 'rgba(37,211,102,.08)', textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="#25D366"><path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/></svg>
                          {c.phone}
                        </a>
                      )}
                      {c.address && (
                        <span className="card-tag">
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1a5 5 0 015 5c0 4-5 9-5 9S3 10 3 6a5 5 0 015-5z"/><circle cx="8" cy="6" r="1.5"/></svg>
                          {c.address.split(',')[0]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        ) : (
          /* ── LIST VIEW ── */
          <div className="clients-list">
            <div className="list-head">
              <div/>
              <div className="list-th">Client</div>
              <div className="list-th">Contact</div>
              <div className="list-th">Invoices</div>
              <div className="list-th">Total Billed</div>
              <div/>
            </div>
            {filtered.map((c) => {
              const col   = avatarColor(c.name)
              const ini   = initials(c.name)
              const stats = statsMap[c.id] ?? { count: 0, total: 0, currency: 'P' }
              const sym   = stats.currency || 'P'
              return (
                <div key={c.id} className="list-row">
                  <div className="list-av" style={{ background: col.bg, borderColor: col.border, color: col.text }}>{ini}</div>
                  <div>
                    <div className="list-name">{c.name}</div>
                    <div className="list-contact">{c.email || '—'}</div>
                  </div>
                  <div className="list-td" style={{ fontSize: 12, color: 'var(--t3)' }}>{c.phone || '—'}</div>
                  <div>
                    <span className="list-inv-count">{stats.count}</span>
                  </div>
                  <div className="list-amt">{fmt(stats.total, sym)}</div>
                  <div>
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer"
                        className="list-wa"
                        title="Message on WhatsApp"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="#25D366"><path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
