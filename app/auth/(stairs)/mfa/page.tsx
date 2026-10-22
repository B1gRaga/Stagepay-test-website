'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Spinner } from '@/components/auth/AuthCard'
import { AuthHead } from '@/components/auth/AuthStairs'
import { safeRedirect } from '@/lib/safe-redirect'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Second step of signing in, for accounts with an authenticator app. One
// field rather than six boxes, so phones can fill the code in for you.
export default function MfaPage() {
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function verify(value = code) {
    if (value.length !== 6 || loading) return
    setLoading(true); setError('')
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified') ?? factors?.totp?.[0]
      if (!totp) { setError('No authenticator app is set up on this account. Sign in again, or ask support for help.'); return }

      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (cErr || !challenge) { setError(cErr?.message ?? 'Couldn’t start the check. Try again.'); return }

      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.id, code: value })
      if (vErr) { setError('That code didn’t match. Codes change every 30 seconds; try the current one.'); setCode('') }
      else window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect')) ?? '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  // Check as soon as the sixth digit is in.
  useEffect(() => { if (code.length === 6) verify(code) }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthHead
      title={<>Enter your <br/>code</>}
      lede="Your account uses two-step sign-in. Enter the 6-digit code from your authenticator app."
    >
      <form method="post" className="ac-form" onSubmit={e => { e.preventDefault(); verify() }}>
        {error && <div className="ac-error" role="alert">{error}</div>}
        <div className="ac-group">
          <label htmlFor="mfa-code">6-digit code</label>
          <input id="mfa-code" name="code" className="ac-input ac-code" type="text" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} autoFocus
            value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} />
        </div>
        <button type="submit" className="ac-btn" disabled={loading || code.length !== 6}>
          {loading ? <><Spinner /> Checking…</> : 'Continue'}
        </button>
      </form>
    </AuthHead>
  )
}
