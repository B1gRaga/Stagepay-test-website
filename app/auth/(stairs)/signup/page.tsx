'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { AuthHead } from '@/components/auth/AuthStairs'
import { EyeIcon, PW_TOGGLE_STYLE } from '@/components/auth/fields'
import { Spinner } from '@/components/auth/AuthCard'
import { BUSINESS_TYPES } from '@/lib/business-types'
import { safeRedirect } from '@/lib/safe-redirect'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)


const LEDE = 'Free to start, no card needed.'

export default function SignupPage() {
  const [step, setStep]                 = useState<1 | 2>(1)
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pre = params.get('email')
    if (pre) setEmail(pre)
  }, [])
  const [businessType, setBusinessType] = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)

  async function handleStepOne(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessType) { setError('Please select your business type'); return }
    setLoading(true); setError('')

    try {
      const hibp = await fetch('/api/auth/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const { pwned } = await hibp.json()
      if (pwned) {
        setError('This password has appeared in a known data breach. Please choose a different password.')
        setLoading(false)
        setStep(1)
        return
      }
    } catch {
      // HIBP check failed — continue with sign-up
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim(), business_type: businessType } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else if (data.session) window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect')) ?? '/dashboard'
    else setDone(true)
  }

  if (done) {
    return (
      <AuthHead title="Check your email" lede={LEDE}>
        <div className="as-done">
          <div className="as-done-ic">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="ac-sub">
            We sent a confirmation link to <strong style={{color:'#1F2A44'}}>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/auth/login" className="ac-btn">Back to sign in</Link>
        </div>
      </AuthHead>
    )
  }

  return (
    <AuthHead title={<>Send your first <br/>invoice tonight</>} lede={LEDE}>

      {step === 1 ? (
        <form method="post" onSubmit={handleStepOne} className="ac-form">
          {error && <div className="ac-error" role="alert">{error}</div>}
          <div className="ac-group">
            <label htmlFor="name">Full name</label>
            <input className="ac-input" id="name" name="name" type="text" required autoComplete="name"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Neo Mothibi"/>
          </div>
          <div className="ac-group">
            <label htmlFor="email">Email address</label>
            <input className="ac-input" id="email" name="email" type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.co.bw"/>
          </div>
          <div className="ac-group">
            <label htmlFor="password">Password</label>
            <div style={{position:'relative'}}>
              <input className="ac-input" id="password" name="password" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" style={{paddingRight:48}}/>
              <button type="button" onClick={() => setShowPw(p => !p)} style={PW_TOGGLE_STYLE}
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>
          <button type="submit" className="ac-btn">Continue</button>
        </form>
      ) : (
        <form method="post" onSubmit={handleSubmit} className="ac-form">
          <div className="as-step">
            <button type="button" className="as-back" onClick={() => { setStep(1); setError('') }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M13 8H3M7 4l-4 4 4 4"/></svg>
              Back
            </button>
            <span>Step 2 of 2</span>
          </div>
          {error && <div className="ac-error" role="alert">{error}</div>}
          <div className="ac-group" role="group" aria-labelledby="bt-label">
            <span className="ac-label" id="bt-label">What kind of business is it?</span>
            <div className="as-choices">
              {BUSINESS_TYPES.map(bt => (
                <button key={bt.value} type="button" className="as-choice"
                  aria-pressed={businessType === bt.value}
                  onClick={() => setBusinessType(bt.value)}>
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading || !businessType} className="ac-btn">
            {loading ? <><Spinner /> Creating account…</> : 'Create free account'}
          </button>
        </form>
      )}

    </AuthHead>
  )
}
