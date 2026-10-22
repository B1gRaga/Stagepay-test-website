'use client'
import { useState } from 'react'
import { Spinner } from '@/components/auth/AuthCard'
import { AuthHead } from '@/components/auth/AuthStairs'
import { BUSINESS_TYPES } from '@/lib/business-types'

// Shown once to accounts with no business type yet (older accounts; sign-up
// asks this itself). The portal sends people here until one is saved.
export default function OnboardingPage() {
  const [selected, setSelected] = useState('')
  const [saving,   setSaving]   = useState<'' | 'pick' | 'skip'>('')
  const [error,    setError]    = useState('')

  async function save(type: string, how: 'pick' | 'skip') {
    setSaving(how); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_type: type }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Couldn’t save. Try again.') }
      window.location.href = '/dashboard'
    } catch (e: any) {
      setError(e.message || 'Couldn’t save. Try again.')
      setSaving('')
    }
  }

  return (
    <AuthHead title={<>One quick <br/>question</>} lede="What kind of business do you run? One tap and you’re in.">
      <form method="post" className="ac-form" onSubmit={e => { e.preventDefault(); if (selected) save(selected, 'pick') }}>
        {error && <div className="ac-error" role="alert">{error}</div>}
        <div className="ac-group" role="group" aria-labelledby="ob-label">
          <span className="ac-label" id="ob-label">Business type</span>
          <div className="as-choices">
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.value} type="button" className="as-choice"
                aria-pressed={selected === bt.value} onClick={() => setSelected(bt.value)}>
                {bt.label}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="ac-btn" disabled={!selected || !!saving}>
          {saving === 'pick' ? <><Spinner /> Saving…</> : 'Continue to dashboard'}
        </button>
      </form>
      {/* Skipping saves "Other", or the portal would send them straight back here. */}
      <p className="ac-foot">
        <button type="button" className="st-skip" disabled={!!saving} onClick={() => save('other', 'skip')}>
          {saving === 'skip' ? 'Skipping…' : 'Skip for now'}
        </button>
      </p>
    </AuthHead>
  )
}
