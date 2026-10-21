'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { AuthHead } from '@/components/auth/AuthStairs'
import { EyeIcon, PW_TOGGLE_STYLE } from '@/components/auth/fields'
import { Spinner } from '@/components/auth/AuthCard'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasMFA = factors?.totp?.some((f: any) => f.status === 'verified') ?? false
      window.location.href = hasMFA ? '/auth/mfa' : '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthHead title={<>Sign in to<br/>StagePay</>}
      lede="Your invoices, reminders and receipts are where you left them."
    >
      <form method="post" onSubmit={handleSubmit} className="ac-form">
        {error && <div className="ac-error" role="alert">{error}</div>}
        <div className="ac-group">
          <label htmlFor="email">Email address</label>
          <input className="ac-input" id="email" name="email" type="email" required autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.co.bw"/>
        </div>
        <div className="ac-group">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <label htmlFor="password">Password</label>
            <Link href="/auth/forgot-password" className="ac-link">Forgot password?</Link>
          </div>
          <div style={{position:'relative'}}>
            <input className="ac-input" id="password" name="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{paddingRight:48}}/>
            <button type="button" onClick={() => setShowPw(p => !p)} style={PW_TOGGLE_STYLE}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              <EyeIcon open={showPw} />
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="ac-btn">
          {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
        </button>
      </form>

    </AuthHead>
  )
}
