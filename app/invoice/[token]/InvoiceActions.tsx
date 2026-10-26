'use client'
import { useState } from 'react'

// Copy an account number, phone number or reference with one tap; parents
// paste these straight into their banking or mobile-money app.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const t = document.createElement('textarea')
      t.value = value; document.body.appendChild(t); t.select()
      try { document.execCommand('copy') } finally { t.remove() }
    }
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" className="pi-copy" onClick={copy} aria-label={`Copy ${label}`}>
      <span aria-live="polite">{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// "I've paid": the client gives the reference from their payment SMS and the
// business confirms it. Mobile money to a personal wallet can't be seen by the
// app, so this is how the business finds out without checking every SMS.
export function PaidClaim({ token, senderName, claimedRef }: { token: string; senderName: string; claimedRef: string | null }) {
  const [step, setStep] = useState<'ask' | 'form' | 'sent'>(claimedRef ? 'sent' : 'ask')
  const [ref, setRef] = useState(claimedRef ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (ref.trim().length < 3) { setErr('Enter the reference from your payment SMS.'); return }
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/invoice/${token}/paid`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: ref.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'That didn’t send. Try again.')
      setStep('sent')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That didn’t send. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'sent') return (
    <div className="pi-claim" aria-live="polite">
      <h2 className="pi-h2">Thank you</h2>
      <p>{senderName} has been told you paid{ref ? <> (reference <b>{ref}</b>)</> : ''}. They will confirm it and send your receipt.</p>
    </div>
  )

  if (step === 'form') return (
    <form className="pi-claim" onSubmit={send}>
      <h2 className="pi-h2">Tell {senderName} you’ve paid</h2>
      <label htmlFor="pi-claim-ref">Reference from your MyZaka, Orange Money or bank SMS</label>
      <input id="pi-claim-ref" className="pi-in" value={ref} onChange={e => setRef(e.target.value)} maxLength={60} autoComplete="off" autoFocus placeholder="e.g. MP241026.1532.A12345" aria-invalid={!!err} />
      {err && <p className="pi-err" role="alert">{err}</p>}
      <div className="pi-claim-btns">
        <button type="submit" className="pi-btn" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        <button type="button" className="pi-btn pi-btn-3" onClick={() => { setStep('ask'); setErr('') }}>Cancel</button>
      </div>
    </form>
  )

  return (
    <div className="pi-claim">
      <h2 className="pi-h2">Already paid?</h2>
      <p>Let {senderName} know, so they can confirm it and send your receipt.</p>
      <div className="pi-claim-btns"><button type="button" className="pi-btn" onClick={() => setStep('form')}>I’ve paid</button></div>
    </div>
  )
}

export function PrintButton() {
  return <button type="button" className="pi-btn pi-btn-2" onClick={() => window.print()}>Print</button>
}
