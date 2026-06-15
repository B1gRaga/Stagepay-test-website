'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'done' | 'error' | 'auth'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user)
      setStatus(data.user ? 'ready' : 'auth')
    })
  }, [])

  async function handleJoin() {
    setStatus('joining')
    const res = await fetch('/api/team/accept', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setStatus('error')
      setErrorMsg(data.error ?? 'Something went wrong')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0F172A', fontFamily: 'var(--font-archivo, sans-serif)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 16px',
        background: '#1E293B', border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 16, padding: 36, textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
            <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
            <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
            <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-bebas, sans-serif)', fontSize: 26, letterSpacing: 3, color: '#F8FAFC' }}>
            Stage<span style={{ color: '#10B981' }}>Pay</span>
          </span>
        </div>

        {status === 'loading' && (
          <p style={{ color: 'rgba(248,250,252,.5)', fontSize: 14 }}>Checking invite…</p>
        )}

        {status === 'auth' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>You&apos;ve been invited</h1>
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,.55)', lineHeight: 1.6, marginBottom: 24 }}>
              Sign in or create a StagePay account to join the team. Your account will automatically be upgraded to Business.
            </p>
            <Link
              href={`/auth/login?redirect=/join/${token}`}
              style={{
                display: 'block', width: '100%', padding: '11px 0', borderRadius: 8,
                background: 'linear-gradient(135deg,#10B981,#059669)', color: '#000',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Sign in to join
            </Link>
            <Link
              href={`/auth/signup?redirect=/join/${token}`}
              style={{
                display: 'block', width: '100%', padding: '11px 0', borderRadius: 8,
                background: 'transparent', color: '#F8FAFC',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,.12)',
              }}
            >
              Create account
            </Link>
          </>
        )}

        {status === 'ready' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>Join the team</h1>
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,.55)', lineHeight: 1.6, marginBottom: 24 }}>
              Accept this invite to join the team on StagePay. You&apos;ll get access to all Business plan features.
            </p>
            <button
              onClick={handleJoin}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 8,
                background: 'linear-gradient(135deg,#10B981,#059669)', color: '#000',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              }}
            >
              Accept invite
            </button>
          </>
        )}

        {status === 'joining' && (
          <p style={{ color: 'rgba(248,250,252,.55)', fontSize: 14 }}>Joining team…</p>
        )}

        {status === 'done' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>You&apos;re in!</h1>
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,.55)' }}>Redirecting to your dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>Invite error</h1>
            <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 20 }}>{errorMsg}</p>
            <Link href="/dashboard" style={{ fontSize: 13, color: '#10B981', textDecoration: 'none' }}>Go to dashboard →</Link>
          </>
        )}
      </div>
    </div>
  )
}
