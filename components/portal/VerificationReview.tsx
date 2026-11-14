'use client'

import { useState } from 'react'

type Item = {
  accountId: string
  status: 'pending' | 'approved' | 'declined'
  businessName: string
  phone: string | null
  registrationNumber: string
  registeredName: string
  submitter: string
  submittedAt: string
  reviewed: string | null
  note: string | null
  certificateUrl: string | null
  payTo: string[]
}

const CSS = `
  .vr-top{height:56px;border-bottom:1px solid var(--line);background:var(--bg2);display:flex;align-items:center;padding:0 28px;}
  .vr-top h1{font-size:18px;font-weight:800;color:var(--t1);}
  .vr{padding:24px 28px;max-width:860px;}
  .vr-lead{font-size:14px;color:var(--t2);line-height:1.55;margin-bottom:18px;max-width:70ch;}
  .vr-lead ol{margin:8px 0 0 20px;}
  .vr-card{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:14px;}
  .vr-card h2{font-size:16px;font-weight:800;color:var(--t1);display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
  .vr-pill{font-size:12px;font-weight:700;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,var(--t1) 8%,transparent);color:var(--t2);}
  .vr-pill.pending{background:#FFF3D6;color:#7A5400;}
  .vr-pill.approved{background:#E5F4E4;color:#1E6B3A;}
  .vr-pill.declined{background:#FBEBEB;color:#9B2C2C;}
  .vr-grid{display:grid;grid-template-columns:170px minmax(0,1fr);gap:6px 16px;margin-top:12px;font-size:14px;}
  .vr-grid dt{color:var(--t2);}
  .vr-grid dd{color:var(--t1);font-weight:600;overflow-wrap:anywhere;}
  .vr-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px;}
  .vr-actions input{flex:1;min-width:220px;height:40px;padding:0 12px;border-radius:8px;border:1px solid var(--line2,var(--line));background:var(--bg);color:var(--t1);font:500 14px var(--font-manrope),sans-serif;}
  .vr-btn{height:40px;padding:0 16px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--t1);font:700 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .vr-btn.ok{background:var(--g);border-color:var(--g);color:#1F2A44;}
  .vr-btn:disabled{opacity:.5;cursor:not-allowed;}
  .vr-err{color:#C0392B;font-size:13px;margin-top:8px;}
  .vr a{color:var(--t1);font-weight:700;}
  @media(max-width:768px){.vr-top{padding:0 16px;}.vr{padding:16px;}.vr-grid{grid-template-columns:1fr;}.vr-grid dt{margin-top:6px;}}
`

export default function VerificationReview({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})

  async function decide(id: string, decision: 'approve' | 'decline') {
    setBusy(id); setErr(e => ({ ...e, [id]: '' }))
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, note: notes[id] || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Couldn’t save that')
      setItems(list => list.map(i => i.accountId === id ? { ...i, status: d.status, note: notes[id] || null, reviewed: 'just now' } : i))
    } catch (e) {
      setErr(m => ({ ...m, [id]: e instanceof Error ? e.message : 'Couldn’t save that' }))
    } finally {
      setBusy(null)
    }
  }

  const waiting = items.filter(i => i.status === 'pending').length

  return (
    <div>
      <style>{CSS}</style>
      <div className="vr-top"><h1>Verifications</h1></div>
      <div className="vr">
        <div className="vr-lead">
          {waiting ? `${waiting} waiting.` : 'Nothing waiting.'} For each business:
          <ol>
            <li>Open the certificate. Search the registration number on <a href="https://www.cipa.co.bw/home" target="_blank" rel="noreferrer">CIPA’s company search</a>: the name must match and the status must be Registered.</li>
            <li>Check the payment details below are in that business’s name (or a director’s, for a small business).</li>
            <li>Approve, or decline with a reason the business can act on.</li>
          </ol>
        </div>

        {items.map(i => (
          <section key={i.accountId} className="vr-card" aria-label={i.businessName}>
            <h2>{i.businessName} <span className={`vr-pill ${i.status}`}>{i.status === 'pending' ? 'Waiting' : i.status === 'approved' ? 'Approved' : 'Declined'}</span></h2>
            <dl className="vr-grid">
              <dt>Name on certificate</dt><dd>{i.registeredName}</dd>
              <dt>CIPA number</dt><dd>{i.registrationNumber}</dd>
              <dt>Certificate</dt><dd>{i.certificateUrl ? <a href={i.certificateUrl} target="_blank" rel="noreferrer">Open (link lasts 1 hour)</a> : 'Missing'}</dd>
              <dt>Payment details on invoices</dt><dd>{i.payTo.length ? i.payTo.map(p => <div key={p}>{p}</div>) : 'None added yet'}</dd>
              <dt>Sent by</dt><dd>{i.submitter} · {new Date(i.submittedAt).toLocaleDateString('en-GB')}</dd>
              {i.phone && <><dt>Business phone</dt><dd>{i.phone}</dd></>}
              {i.reviewed && <><dt>Decided</dt><dd>{i.reviewed}{i.note ? ` · ${i.note}` : ''}</dd></>}
            </dl>
            {i.status === 'pending' && (
              <>
                <div className="vr-actions">
                  <input aria-label={`Reason or note for ${i.businessName}`} placeholder="Reason, if declining (the business sees it)" value={notes[i.accountId] ?? ''} onChange={e => setNotes(n => ({ ...n, [i.accountId]: e.target.value }))} />
                  <button type="button" className="vr-btn" disabled={busy === i.accountId} onClick={() => decide(i.accountId, 'decline')}>Decline</button>
                  <button type="button" className="vr-btn ok" disabled={busy === i.accountId} onClick={() => decide(i.accountId, 'approve')}>Approve</button>
                </div>
                {err[i.accountId] && <p className="vr-err" role="alert">{err[i.accountId]}</p>}
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
