'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Spinner } from '@/components/auth/AuthCard'
import { AuthHead } from '@/components/auth/AuthStairs'

// A team invite link. Signed out: sign in or sign up first, then come back
// here (the redirect is carried through). Signed in: accept, then open the
// business they've joined.
export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'auth' | 'ready' | 'joining' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [business, setBusiness] = useState('')
  const back = `?redirect=${encodeURIComponent(`/join/${token}`)}`

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data }) => setStatus(data.user ? 'ready' : 'auth'))
  }, [])

  async function handleJoin() {
    setStatus('joining')
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErrorMsg(data.error ?? 'Something went wrong. Try the link again.'); setStatus('error'); return }
      setBusiness(data.business ?? '')
      setStatus('done')
      setTimeout(() => { window.location.href = '/dashboard' }, 1600)
    } catch {
      setErrorMsg('Couldn’t reach StagePay. Check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return <AuthHead title={<>Checking your<br/>invite</>}><p className="ac-hint" role="status">One moment…</p></AuthHead>
  }

  if (status === 'auth') {
    return (
      <AuthHead title={<>You’re invited<br/>to a team</>} lede="Sign in or create a StagePay account to join. You’ll work in their business with your own sign-in.">
        <div className="ac-form">
          <Link href={`/auth/login${back}`} className="ac-btn">Sign in to join</Link>
          <Link href={`/auth/signup${back}`} className="ac-btn ac-btn-2">Create an account</Link>
        </div>
      </AuthHead>
    )
  }

  if (status === 'done') {
    return <AuthHead title="You’re in" lede={`Opening ${business || 'the business'}…`}><span /></AuthHead>
  }

  if (status === 'error') {
    return (
      <AuthHead title={<>This invite<br/>didn’t work</>} lede="Ask whoever invited you to send a new link if this one has expired or was already used.">
        <div className="ac-form">
          <div className="ac-error" role="alert">{errorMsg}</div>
          <Link href="/dashboard" className="ac-btn ac-btn-2">Go to your dashboard</Link>
        </div>
      </AuthHead>
    )
  }

  return (
    <AuthHead title={<>Join the<br/>team</>} lede="Accept to work in this business on StagePay. Anything you already have stays in your own business; switch between the two from your avatar menu.">
      <div className="ac-form">
        <button type="button" className="ac-btn" disabled={status === 'joining'} onClick={handleJoin}>
          {status === 'joining' ? <><Spinner /> Joining…</> : 'Accept invite'}
        </button>
      </div>
    </AuthHead>
  )
}
