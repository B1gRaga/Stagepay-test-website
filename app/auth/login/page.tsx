'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const supabase = supabaseClient

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/app.html'
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <Link href="/" style={s.logo}>Stage<span style={s.logoGreen}>Pay</span></Link>
        <h1 style={s.heading}>Welcome back</h1>
        <p style={s.sub}>Sign in to your account</p>

        <form onSubmit={handleSubmit} style={s.form}>
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
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={s.input}
          />

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" disabled={loading} style={loading ? {...s.btn, opacity: 0.6} : s.btn}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={s.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={s.link}>Create one free</Link>
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
    transition: 'background 0.2s',
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
