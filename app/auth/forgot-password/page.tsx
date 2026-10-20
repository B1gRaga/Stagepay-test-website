'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { AuthCard, Spinner } from '@/components/auth/AuthCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [expired, setExpired] = useState(false)

  // Arriving here from an old or used reset link.
  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expired') === '1')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      // Rate limits are worth showing; anything else gets the same answer, so
      // this page never reveals whether an email has an account.
      if (error && /seconds|rate|too many/i.test(error.message)) { setError(error.message); return }
      setSent(true)
    } catch {
      setError('Couldn’t reach StagePay. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      sub={sent ? undefined : 'Enter the email you sign in with and we’ll send you a link to choose a new password.'}
      foot={<>Remembered it? <Link href="/auth/login">Back to log in</Link></>}
    >
      {sent ? (
        <div className="ac-ok" role="status">
          If <b>{email.trim()}</b> has a StagePay account, a reset link is on its way. It can take a minute or two; check your spam folder too. The link works once and expires after an hour.
        </div>
      ) : (
        <form method="post" className="ac-form" onSubmit={handleSubmit}>
          {expired && <div className="ac-error" role="alert">That reset link has expired or was already used. Ask for a new one below.</div>}
          {error && <div className="ac-error" role="alert">{error}</div>}
          <div className="ac-group">
            <label htmlFor="fp-email">Email</label>
            <input id="fp-email" name="email" className="ac-input" type="email" required autoComplete="email" autoFocus
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="ac-btn" disabled={loading || !email.trim()}>
            {loading ? <><Spinner /> Sending…</> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
