'use client'

import { useEffect, useRef, useState } from 'react'
import type { Verification } from '@/lib/verification'

// Settings → Verification. A business sends its CIPA certificate once;
// StagePay checks it against CIPA's register and the payment details on its
// invoices. Approved businesses can send from StagePay's WhatsApp number.
// Uses the Settings page's own classes (.block, .fld, .in, .save, .btn-line).

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function VerifyBusiness({ businessName }: { businessName: string }) {
  const [v, setV] = useState<Verification | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    let live = true
    fetch('/api/verification', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (live) setV(d.verification) })
      .catch(() => { if (live) setLoadErr(true) })
    return () => { live = false }
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/verification', { method: 'POST', credentials: 'include', body: new FormData(e.currentTarget) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Couldn’t send that. Try again.')
      setV(d.verification); setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t send that. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loadErr) return <p className="help">Couldn’t load your verification. Refresh to try again.</p>
  if (!v) return <p className="help">Loading…</p>

  const showForm = v.status === 'none' || editing || (v.status === 'declined' && editing)

  return (
    <>
      {v.status === 'approved' && (
        <section className="block" aria-labelledby="ver-state">
          <h3 id="ver-state">Verified</h3>
          <p>{v.registered_name} ({v.registration_number}) was verified on {when(v.reviewed_at)}. You can send invoices from StagePay’s WhatsApp number, one at a time or to a whole class at once.</p>
        </section>
      )}

      {v.status === 'pending' && !editing && (
        <section className="block" aria-labelledby="ver-state">
          <h3 id="ver-state">Waiting for review</h3>
          <p>We received {v.registered_name} ({v.registration_number}) on {when(v.submitted_at)} and are checking it against CIPA’s register. This usually takes one working day; we’ll email the account owner.</p>
          <button type="button" className="btn-line press" onClick={() => setEditing(true)}>Correct the details</button>
        </section>
      )}

      {v.status === 'declined' && !editing && (
        <section className="block" aria-labelledby="ver-state">
          <h3 id="ver-state">Needs another look</h3>
          <p>We couldn’t verify {v.registered_name} yet.{v.decision_note ? <> Reason: <b>{v.decision_note}</b></> : null}</p>
          <button type="button" className="save press" onClick={() => setEditing(true)}>Send the details again</button>
        </section>
      )}

      {showForm && (
        <form className="block" aria-labelledby="ver-form" onSubmit={submit}>
          <h3 id="ver-form">Verify {businessName}</h3>
          <p>
            To send invoices from StagePay’s WhatsApp number, we check that your business is registered with CIPA,
            and that the payment details on your invoices are in its name. You can always send from your own WhatsApp without this.
          </p>
          <div className="grid2">
            <div className="fld">
              <label htmlFor="ver-name">Business name on the certificate</label>
              <input id="ver-name" name="registered_name" className="in" required maxLength={120} defaultValue={v.registered_name ?? ''} autoComplete="organization" />
            </div>
            <div className="fld">
              <label htmlFor="ver-number">Registration number (UIN)</label>
              <input id="ver-number" name="registration_number" className="in" required maxLength={40} defaultValue={v.registration_number ?? ''} placeholder="BW00001234567" autoComplete="off" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="fld">
              <label htmlFor="ver-you">Your name</label>
              <input id="ver-you" name="submitter_name" className="in" required maxLength={80} defaultValue={v.submitter_name ?? ''} autoComplete="name" />
            </div>
            <div className="fld">
              <label htmlFor="ver-role">Your role <span className="help">(optional)</span></label>
              <input id="ver-role" name="submitter_role" className="in" maxLength={60} defaultValue={v.submitter_role ?? ''} placeholder="Owner, bursar, accountant…" />
            </div>
            <div className="fld full">
              <label htmlFor="ver-file">CIPA certificate</label>
              <input id="ver-file" ref={fileRef} name="certificate" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
              <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn-line press" onClick={() => fileRef.current?.click()}>{fileName ? 'Choose a different file' : 'Choose file'}</button>
                <span className="help">{fileName || 'PDF or a clear photo, under 5 MB'}</span>
              </span>
            </div>
          </div>
          {err && <p className="save-note err" role="alert" style={{ marginTop: 12 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="submit" className="save press" disabled={sending}>{sending ? 'Sending…' : 'Send for review'}</button>
            {editing && <button type="button" className="btn-line press" onClick={() => setEditing(false)} disabled={sending}>Cancel</button>}
          </div>
          <p className="help" style={{ marginTop: 12 }}>Your certificate is kept privately and only used to check your business.</p>
        </form>
      )}
    </>
  )
}
