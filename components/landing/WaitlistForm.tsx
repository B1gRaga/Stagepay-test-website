'use client'

import { useState } from 'react'
import { BUSINESS_TYPES } from '@/lib/business-types'
import { WAITLIST_TOWNS, CURRENT_METHODS, WOULD_PAY, REFERRAL_CODE_RE } from '@/lib/waitlist'

// Pre-launch signup. ?ref=<code> credits whoever shared the link, and
// ?src= / ?utm_source= tags the campaign (flyer, radio, a Facebook group).
export function WaitlistForm() {
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [town, setTown] = useState('')
  const [currentMethod, setCurrentMethod] = useState('')
  const [wouldPay, setWouldPay] = useState('')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<null | { code: string | null }>(null)
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!wouldPay) { setError('Choose an answer about the price.'); return }
    const q = new URLSearchParams(window.location.search)
    const ref = q.get('ref')
    const referredBy = ref && REFERRAL_CODE_RE.test(ref) ? ref : null
    const src = q.get('src') || q.get('utm_source')
    const source = src ? src.slice(0, 40) : referredBy ? 'referral' : null
    setBusy(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName, whatsapp, email, business_type: businessType, town,
          current_method: currentMethod, would_pay: wouldPay, note, consent,
          source, referred_by: referredBy,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 429) setError('Too many tries. Wait a minute and try again.')
      else if (!res.ok) setError(json.error || 'Your details didn’t save. Try again.')
      else setDone({ code: json.alreadyExists ? null : json.referral_code ?? null })
    } catch {
      setError('Your details didn’t save. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const link = done.code ? `${window.location.origin}/?ref=${done.code}#waitlist` : ''
    const share = `I just joined the StagePay waitlist. It sends your invoices on WhatsApp and reminds clients until they pay. Join here: ${link}`
    return (
      <div className="panel-card wl-done" role="status">
        <h3>{done.code ? `You’re on the list, ${fullName.split(' ')[0]}.` : 'That number is already on the list.'}</h3>
        <p>We’ll message you on WhatsApp the day StagePay opens.</p>
        {done.code && <>
          <p className="wl-share-lede">Know someone who still invoices from a receipt book? Send them your link.</p>
          <div className="wl-share">
            <a className="btn btn-amber" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
            <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })}>{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </>}
      </div>
    )
  }

  return (
    <form className="panel-card demo-grid" onSubmit={submit}>
      <div className="field"><label htmlFor="w-name">Your name</label><input id="w-name" autoComplete="name" required minLength={2} maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} /></div>
      <div className="field"><label htmlFor="w-wa">WhatsApp number</label><input id="w-wa" type="tel" inputMode="tel" autoComplete="tel" required placeholder="71 234 567" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} /></div>
      <div className="wl-2">
        <div className="field"><label htmlFor="w-biz">Type of business</label>
          <select id="w-biz" required value={businessType} onChange={e => setBusinessType(e.target.value)}>
            <option value="" disabled>Choose one</option>
            {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select></div>
        <div className="field"><label htmlFor="w-town">Town</label>
          <select id="w-town" required value={town} onChange={e => setTown(e.target.value)}>
            <option value="" disabled>Choose one</option>
            {WAITLIST_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}
          </select></div>
      </div>
      <div className="field"><label htmlFor="w-how">How do you invoice clients today?</label>
        <select id="w-how" required value={currentMethod} onChange={e => setCurrentMethod(e.target.value)}>
          <option value="" disabled>Choose one</option>
          {CURRENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select></div>
      <fieldset className="wl-opts">
        <legend>Pro will cost P100 a month. Would you pay that?</legend>
        <div>{WOULD_PAY.map(p => (
          <label key={p.value}><input type="radio" name="would_pay" value={p.value} checked={wouldPay === p.value} onChange={() => setWouldPay(p.value)} /><span>{p.label}</span></label>
        ))}</div>
      </fieldset>
      <div className="field"><label htmlFor="w-note">What’s the hardest part of getting paid? <span className="wl-opt">Optional</span></label><textarea id="w-note" maxLength={600} value={note} onChange={e => setNote(e.target.value)} /></div>
      <div className="field"><label htmlFor="w-email">Email <span className="wl-opt">Optional</span></label><input id="w-email" type="email" autoComplete="email" maxLength={200} value={email} onChange={e => setEmail(e.target.value)} /></div>
      <label className="wl-consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /> StagePay can contact me on WhatsApp about the launch.</label>
      {error && <p className="wl-error" role="alert">{error}</p>}
      <button className="btn btn-amber" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Join the waitlist'}</button>
    </form>
  )
}
