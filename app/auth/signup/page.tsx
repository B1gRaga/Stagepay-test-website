'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = supabaseClient

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      window.location.href = '/app.html'
    } else {
      // Email confirmation is on — show check email screen
      setDone(true)
    }
  }

  if (done) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <Link href="/" style={s.logo}>Stage<span style={s.logoGreen}>Pay</span></Link>
          <div style={s.checkCircle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={s.heading}>Check your email</h1>
          <p style={{...s.sub, marginBottom: 0}}>
            We sent a confirmation link to <strong style={{color:'#F0F4F8'}}>{email}</strong>.
            Click it to activate your account and get started.
          </p>
          <p style={{...s.footer, marginTop: 28}}>
            Already confirmed?{' '}
            <Link href="/auth/login" style={s.link}>Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Link href="/" style={s.logo}>Stage<span style={s.logoGreen}>Pay</span></Link>
        <h1 style={s.heading}>Create your account</h1>
        <p style={s.sub}>Free forever — no credit card needed</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Full name</label>
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Doe"
            style={s.input}
          />

          <label style={s.label}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={s.input}
          />

          <label style={s.label}>Password</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={s.input}
          />

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" disabled={loading} style={loading ? {...s.btn, opacity: 0.6} : s.btn}>
            {loading ? 'Creating account…' : 'Create free account'}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{' '}
          <Link href="/auth/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060A12',
    padding: '24px 16px',
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#0C1220',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '40px 36px',
  },
  logo: {
    display: 'block',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 24,
    letterSpacing: 3,
    color: '#F0F4F8',
    textDecoration: 'none',
    marginBottom: 28,
  },
  logoGreen: { color: '#10B981' },
  heading: {
    fontSize: 22,
    fontWeight: 600,
    color: '#F0F4F8',
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(240,244,248,0.5)',
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(240,244,248,0.7)',
    marginTop: 10,
    marginBottom: 2,
  },
  input: {
    background: '#131B2E',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: '#F0F4F8',
    outline: 'none',
    width: '100%',
  },
  error: {
    fontSize: 13,
    color: '#F87171',
    marginTop: 8,
    padding: '10px 12px',
    background: 'rgba(248,113,113,0.08)',
    borderRadius: 8,
    border: '1px solid rgba(248,113,113,0.2)',
  },
  btn: {
    marginTop: 20,
    padding: '12px',
    background: '#10B981',
    color: '#060A12',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(240,244,248,0.45)',
  },
  link: {
    color: '#10B981',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
