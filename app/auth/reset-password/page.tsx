'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { AuthCard, Spinner } from '@/components/auth/AuthCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Step = 'checking' | 'no-session' | 'code' | 'password' | 'done'

// Reached from the reset email via /auth/callback, which has already signed
// the person in. Accounts with two-step sign-in confirm a code first, because
// a password can only be changed from a fully signed-in session.
export default function ResetPasswordPage() {
  const [step, setStep]       = useState<Step>('checking')
  const [code, setCode]       = useState('')
  const [pw, setPw]           = useState('')
  const [again, setAgain]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStep('no-session'); return }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setStep(aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2' ? 'code' : 'password')
    })().catch(() => setStep('no-session'))
  }, [])

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true); setError('')
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified')
      if (!totp) { setStep('password'); return }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code })
      if (error) { setError('That code didn’t match. Codes change every 30 seconds; try the current one.'); setCode(''); return }
      setStep('password')
    } finally {
      setLoading(false)
    }
  }

  const problem = !pw ? '' : pw.length < 8 ? 'Use at least 8 characters.' : again && again !== pw ? 'The two passwords don’t match.' : ''

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 8 || pw !== again) return
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) {
        setError(/different from the old/i.test(error.message) ? 'Choose a password you haven’t used for StagePay before.' : error.message)
        return
      }
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'checking') {
    return <AuthCard title="Reset your password"><p className="ac-hint" role="status">Checking your link…</p></AuthCard>
  }

  if (step === 'no-session') {
    return (
      <AuthCard
        title="This link has expired"
        sub="Reset links work once and expire after an hour. Ask for a new one and use the latest email."
        foot={<Link href="/auth/login">Back to log in</Link>}
      >
        <Link href="/auth/forgot-password" className="ac-btn">Send a new link</Link>
      </AuthCard>
    )
  }

  if (step === 'done') {
    return (
      <AuthCard title="Password changed" sub="You’re signed in. Use your new password next time you log in.">
        <a href="/dashboard" className="ac-btn">Go to your dashboard</a>
      </AuthCard>
    )
  }

  if (step === 'code') {
    return (
      <AuthCard
        title="Confirm it’s you"
        sub="Your account uses two-step sign-in. Enter the 6-digit code from your authenticator app to continue."
        foot={<Link href="/auth/login">Back to log in</Link>}
      >
        <form method="post" className="ac-form" onSubmit={verifyCode}>
          {error && <div className="ac-error" role="alert">{error}</div>}
          <div className="ac-group">
            <label htmlFor="rp-code">6-digit code</label>
            <input id="rp-code" name="code" className="ac-input ac-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} />
          </div>
          <button type="submit" className="ac-btn" disabled={loading || code.length !== 6}>
            {loading ? <><Spinner /> Checking…</> : 'Continue'}
          </button>
        </form>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" foot={<Link href="/auth/login">Back to log in</Link>}>
      <form method="post" className="ac-form" onSubmit={savePassword}>
        {error && <div className="ac-error" role="alert">{error}</div>}
        <div className="ac-group">
          <label htmlFor="rp-new">New password</label>
          <input id="rp-new" name="new-password" className="ac-input" type="password" autoComplete="new-password" autoFocus
            value={pw} onChange={e => { setPw(e.target.value); setError('') }} />
        </div>
        <div className="ac-group">
          <label htmlFor="rp-again">Type it again</label>
          <input id="rp-again" name="confirm-password" className="ac-input" type="password" autoComplete="new-password"
            value={again} onChange={e => { setAgain(e.target.value); setError('') }} />
          <span className="ac-hint" role={problem ? 'alert' : undefined} style={problem ? { color: '#B91C1C' } : undefined}>{problem || 'At least 8 characters.'}</span>
        </div>
        <button type="submit" className="ac-btn" disabled={loading || pw.length < 8 || pw !== again}>
          {loading ? <><Spinner /> Saving…</> : 'Save new password'}
        </button>
      </form>
    </AuthCard>
  )
}
