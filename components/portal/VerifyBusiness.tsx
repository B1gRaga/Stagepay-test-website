'use client'

import { useEffect, useRef, useState } from 'react'
import type { Verification, VerificationKind } from '@/lib/verification'

// Settings → Verification. A business sends its CIPA certificate, or a tutor
// who isn't registered sends their Omang; StagePay checks it and the payment
// details on its invoices. Approved businesses can send from StagePay's
// WhatsApp number.
// Uses the Settings page's own classes (.block, .fld, .in, .chips, .save, .btn-line).

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function VerifyBusiness({ businessName, bulkSend }: { businessName: string; bulkSend: boolean }) {
  const [v, setV] = useState<Verification | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [kind, setKind] = useState<VerificationKind>('company')

  useEffect(() => {
    let live = true
    fetch('/api/verification', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (live) { setV(d.verification); if (d.verification?.kind) setKind(d.verification.kind) } })
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

  function choose(k: VerificationKind) {
    setKind(k); setFileName(''); setErr('')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loadErr) return <p className="help">Couldn’t load your verification. Refresh to try again.</p>
  if (!v) return <p className="help">Loading…</p>

  const showForm = v.status === 'none' || editing
  const ind = kind === 'individual'
  // A number cut to its last 4 digits after review is no use as a starting value.
  const sameKind = (v.kind ?? 'company') === kind
  const prevNumber = sameKind && v.registration_number && !v.registration_number.startsWith('*') ? v.registration_number : ''
  const prevName = sameKind ? v.registered_name ?? '' : ''
  const checking = v.kind === 'individual' ? 'your Omang' : 'it against CIPA’s register'

  return (
    <>
      {v.status === 'approved' && (
        <section className="block" aria-labelledby="ver-state">
          <h3 id="ver-state">Verified</h3>
          <p>{v.registered_name} ({v.registration_number}) was verified on {when(v.reviewed_at)}. You can send invoices from StagePay’s WhatsApp number{bulkSend ? ', one at a time or to a whole class at once' : '. Sending to a whole class at once comes with the Business plan'}.</p>
        </section>
      )}

      {v.status === 'pending' && !editing && (
        <section className="block" aria-labelledby="ver-state">
          <h3 id="ver-state">Waiting for review</h3>
          <p>We received {v.registered_name} on {when(v.submitted_at)} and are checking {checking}. This usually takes one working day; we’ll email the account owner.</p>
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
            To send invoices from StagePay’s WhatsApp number, we check who you are and that the payment details on your
            invoices are in that name. You can always send from your own WhatsApp without this.
          </p>
          <div className="chips" role="group" aria-label="Is your business registered with CIPA?" style={{ marginBottom: 18 }}>
            <button type="button" className="chip press" aria-pressed={!ind} onClick={() => choose('company')}>Registered with CIPA</button>
            <button type="button" className="chip press" aria-pressed={ind} onClick={() => choose('individual')}>Not registered (I work on my own)</button>
          </div>
          <input type="hidden" name="kind" value={kind} />

          {ind ? (
            <div className="grid2" key="individual">
              <div className="fld">
                <label htmlFor="ver-name">Your full name, as on your Omang</label>
                <input id="ver-name" name="registered_name" className="in" required maxLength={120} defaultValue={prevName} autoComplete="name" />
              </div>
              <div className="fld">
                <label htmlFor="ver-number">Omang number</label>
                <input id="ver-number" name="omang_number" className="in" required inputMode="numeric" maxLength={11} defaultValue={prevNumber} placeholder="9 digits" autoComplete="off" />
              </div>
              <div className="fld full">
                <label htmlFor="ver-file">Photo of the front of your Omang</label>
                <input id="ver-file" ref={fileRef} name="certificate" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
                <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-line press" onClick={() => fileRef.current?.click()}>{fileName ? 'Choose a different photo' : 'Choose photo'}</button>
                  <span className="help">{fileName || 'A clear photo, under 5 MB'}</span>
                </span>
              </div>
              <p className="help full">The bank or mobile money account on your invoices must be in this name.</p>
            </div>
          ) : (
            <div className="grid2" key="company">
              <div className="fld">
                <label htmlFor="ver-name">Business name on the certificate</label>
                <input id="ver-name" name="registered_name" className="in" required maxLength={120} defaultValue={prevName} autoComplete="organization" />
              </div>
              <div className="fld">
                <label htmlFor="ver-number">Registration number (UIN)</label>
                <input id="ver-number" name="registration_number" className="in" required maxLength={40} defaultValue={prevNumber} placeholder="BW00001234567" autoComplete="off" style={{ textTransform: 'uppercase' }} />
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
          )}

          {err && <p className="save-note err" role="alert" style={{ marginTop: 12 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="submit" className="save press" disabled={sending}>{sending ? 'Sending…' : 'Send for review'}</button>
            {editing && <button type="button" className="btn-line press" onClick={() => setEditing(false)} disabled={sending}>Cancel</button>}
          </div>
          <p className="help" style={{ marginTop: 12 }}>
            {ind
              ? 'Your Omang is kept privately and only used to check it’s you. We delete the photo as soon as we’ve checked it, and keep only the last 4 digits of the number.'
              : 'Your certificate is kept privately and only used to check your business.'}
          </p>
        </form>
      )}
    </>
  )
}
