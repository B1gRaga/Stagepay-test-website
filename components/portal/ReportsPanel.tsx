'use client'
import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/payments'

type Sums = { count: number; net: number; vat: number; gross: number; received: number }
type Totals = Sums & { currency: string; owed: number; months: (Sums & { month: string })[]; clients: (Sums & { client: string })[] }

// Quick periods, worked out from today in Botswana. Months are calendar months.
// "Last 2 months" is the usual VAT return period, so the VAT figure can go
// straight onto the return.
function presets() {
  const today = todayIso()
  const [y, m] = today.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate()
  const back = (n: number) => { const d = new Date(Date.UTC(y, m - 1 - n, 1)); return [d.getUTCFullYear(), d.getUTCMonth() + 1] as const }
  const [py, pm] = back(1)
  const [qy, qm] = back(2)
  return [
    { id: 'month',     label: 'This month',    from: `${y}-${pad(m)}-01`,   to: today },
    { id: 'lastmonth', label: 'Last month',    from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDay(py, pm))}` },
    { id: 'last2',     label: 'Last 2 months', from: `${qy}-${pad(qm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDay(py, pm))}` },
    { id: 'year',      label: 'This year',     from: `${y}-01-01`,          to: today },
    { id: 'lastyear',  label: 'Last year',     from: `${y - 1}-01-01`,      to: `${y - 1}-12-31` },
  ]
}

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const SHOW_CLIENTS = 8

// Net, VAT, gross and received per month or per client, as a compact table.
function Breakdown({ title, rows, sym, label }: { title: string; rows: (Sums & { key: string })[]; sym: string; label: string }) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) return null
  const shown = all ? rows : rows.slice(0, SHOW_CLIENTS)
  return (
    <div className="rp-bd">
      <h3>{title}</h3>
      <table>
        <thead><tr><th scope="col">{label}</th><th scope="col" className="r">Invoices</th><th scope="col" className="r bv">Before VAT</th><th scope="col" className="r">VAT</th><th scope="col" className="r">Invoiced</th><th scope="col" className="r">Received</th></tr></thead>
        <tbody>
          {shown.map(r => (
            <tr key={r.key}>
              <th scope="row">{r.key}</th>
              <td className="r">{r.count}</td>
              <td className="r bv">{fmt(r.net, sym)}</td>
              <td className="r">{fmt(r.vat, sym)}</td>
              <td className="r">{fmt(r.gross, sym)}</td>
              <td className="r">{fmt(r.received, sym)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > SHOW_CLIENTS && (
        <button type="button" className="rp-more" onClick={() => setAll(v => !v)}>{all ? 'Show fewer' : `All ${rows.length}`}</button>
      )}
    </div>
  )
}

const CSS = `
  .rp{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px 18px 18px;margin-bottom:18px;animation:rp-in var(--dur-2) var(--ease) both;}
  .rp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 20px;flex-wrap:wrap;margin-bottom:14px;}
  .rp-quick{display:flex;gap:6px;flex-wrap:wrap;}
  .rp-quick button{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t2);font:600 13px var(--font-manrope),sans-serif;cursor:pointer;}
  .rp-quick button:hover{color:var(--t1);border-color:var(--t3);}
  .rp-quick button[aria-pressed="true"]{color:var(--t1);border-color:var(--g);background:color-mix(in srgb,var(--g) 12%,transparent);}
  .rp-dates{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;}
  .rp-dates label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--t2);}
  .rp-dates input{height:34px;background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:0 10px;font:600 13px var(--font-manrope),sans-serif;color:var(--t1);outline:none;}
  .rp-dates input:focus{border-color:var(--g);}
  .rp button:focus-visible,.rp a:focus-visible{outline:2px solid var(--g);outline-offset:2px;}

  .rp-cur{font-size:12px;font-weight:700;color:var(--t3);letter-spacing:.04em;text-transform:uppercase;margin:6px 0 8px;}
  .rp-figs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:12px;}
  .rp-fig{background:var(--bg2);padding:12px 14px;min-width:0;}
  .rp-fig dt{font-size:13px;color:var(--t2);}
  .rp-fig dd{font-size:20px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rp-fig .rp-sub{display:block;font-size:12px;font-weight:500;color:var(--t3);margin-top:2px;}
  .rp-note{font-size:14px;color:var(--t2);margin:4px 0 12px;}
  .rp-err{font-size:13px;color:#E5484D;margin-bottom:12px;}

  .rp-bds{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px 18px;margin:2px 0 14px;}
  .rp-bd{min-width:0;overflow-x:auto;}
  .rp-bd h3{font-size:13px;font-weight:700;color:var(--t2);margin:0 0 6px;}
  .rp-bd table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;}
  .rp-bd th,.rp-bd td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap;}
  .rp-bd th{font-weight:600;color:var(--t2);}
  .rp-bd thead th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--t3);}
  .rp-bd tbody th{color:var(--t1);overflow:hidden;text-overflow:ellipsis;max-width:180px;}
  .rp-bd .r{text-align:right;}
  .rp-bd td{color:var(--t1);}
  .rp-more{margin-top:6px;height:28px;padding:0 10px;border-radius:6px;border:1px solid var(--line2);background:transparent;color:var(--t2);font:600 12px var(--font-manrope),sans-serif;cursor:pointer;}
  .rp-dl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
  .rp-dl a{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--line2);color:var(--t1);font:700 13px var(--font-manrope),sans-serif;text-decoration:none;}
  .rp-dl a:hover{border-color:var(--t3);}
  .rp-dl span{font-size:13px;color:var(--t3);}
  @media(max-width:768px){
    .rp{padding:14px 16px 16px;}
    .rp-figs{grid-template-columns:repeat(2,minmax(0,1fr));}
    .rp-dates{width:100%;}
    .rp-dates label{flex:1;}
    .rp-dates input{width:100%;}
    .rp-bds{grid-template-columns:1fr;}
    .rp-bd .bv{display:none;}
    .rp-bd th,.rp-bd td{padding:6px 4px;font-size:12px;}
    .rp-bd tbody th{max-width:96px;}
  }
  @keyframes rp-in{from{opacity:0;transform:translateY(-4px)}}
  @media (prefers-reduced-motion: reduce){.rp{animation:none;}}
`

// Money for a period: what was invoiced (with the VAT on it), what came in,
// and what's owed today, plus the two spreadsheets an accountant asks for.
export default function ReportsPanel() {
  const quick = presets()
  const [from, setFrom] = useState(quick[0].from)
  const [to, setTo] = useState(quick[0].to)
  const [totals, setTotals] = useState<Totals[] | null>(null)
  const [error, setError] = useState('')

  const valid = !!from && !!to && from <= to
  const qs = `from=${from}&to=${to}`

  useEffect(() => {
    if (!valid) return
    const ctrl = new AbortController()
    fetch(`/api/reports?${qs}`, { credentials: 'include', signal: ctrl.signal })
      .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error); setTotals(d.totals); setError('') }))
      .catch(e => { if (e.name !== 'AbortError') setError(e.message || 'Couldn’t load the report.') })
    return () => ctrl.abort()
  }, [qs, valid])

  const active = quick.find(p => p.from === from && p.to === to)?.id

  return (
    <section className="rp" aria-label="Report">
      <style>{CSS}</style>
      <div className="rp-head">
        <div className="rp-quick" role="group" aria-label="Period">
          {quick.map(p => (
            <button key={p.id} type="button" className="press" aria-pressed={active === p.id} onClick={() => { setFrom(p.from); setTo(p.to) }}>{p.label}</button>
          ))}
        </div>
        <div className="rp-dates">
          <label>From<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        </div>
      </div>

      {!valid && <p className="rp-err">The start date needs to be on or before the end date.</p>}
      {error && <p className="rp-err">{error}</p>}

      {valid && totals && totals.length === 0 && <p className="rp-note">No invoices or payments in this period.</p>}
      {valid && totals?.map(t => (
        <div key={t.currency}>
          {totals.length > 1 && <div className="rp-cur">{t.currency}</div>}
          <dl className="rp-figs">
            <div className="rp-fig"><dt>Invoiced</dt><dd>{fmt(t.gross, t.currency)}<span className="rp-sub">{t.count} {t.count === 1 ? 'invoice' : 'invoices'}</span></dd></div>
            <div className="rp-fig"><dt>Before VAT</dt><dd>{fmt(t.net, t.currency)}</dd></div>
            <div className="rp-fig"><dt>VAT charged</dt><dd>{fmt(t.vat, t.currency)}<span className="rp-sub">Output VAT for the period</span></dd></div>
            <div className="rp-fig"><dt>Received</dt><dd>{fmt(t.received, t.currency)}<span className="rp-sub">{fmt(t.owed, t.currency)} owed today</span></dd></div>
          </dl>
          <div className="rp-bds">
            <Breakdown title="By month" label="Month" sym={t.currency} rows={t.months.map(m => ({ ...m, key: monthLabel(m.month) }))} />
            <Breakdown title="By client" label="Client" sym={t.currency} rows={t.clients.map(c => ({ ...c, key: c.client }))} />
          </div>
        </div>
      ))}

      <div className="rp-dl">
        <a className="press" href={valid ? `/api/reports?${qs}&format=csv&type=invoices` : undefined} download aria-disabled={!valid}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13.5h12"/></svg>
          Invoices (CSV)
        </a>
        <a className="press" href={valid ? `/api/reports?${qs}&format=csv&type=payments` : undefined} download aria-disabled={!valid}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13.5h12"/></svg>
          Payments (CSV)
        </a>
        <a className="press" href={valid ? `/api/reports?${qs}&format=csv&type=summary` : undefined} download aria-disabled={!valid}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M8 2v9m0 0l-3-3m3 3l3-3M2 13.5h12"/></svg>
          Summary (CSV)
        </a>
        <span>Opens in Excel or Google Sheets. Send it to your accountant.</span>
      </div>
    </section>
  )
}
