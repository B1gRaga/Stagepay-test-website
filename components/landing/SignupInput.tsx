'use client'

import { useRef } from 'react'

interface SignupInputProps {
  variant?: 'hero' | 'final'
}

export function SignupInput({ variant = 'hero' }: SignupInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)

  function handleSignup() {
    const email = inputRef.current?.value.trim() ?? ''
    if (!email || !email.includes('@')) {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.style.borderColor = '#EF4444'
        setTimeout(() => { if (inputRef.current) inputRef.current.style.borderColor = '' }, 1500)
      }
      return
    }
    if (typeof window !== 'undefined' && typeof (window as unknown as { gtag?: Function }).gtag === 'function') {
      (window as unknown as { gtag: Function }).gtag('event', 'sign_up', { method: 'landing_page', email_domain: email.split('@')[1] })
    }
    const t = toastRef.current
    if (t) {
      t.style.opacity = '1'
      t.style.transform = 'translateX(-50%) translateY(0)'
      setTimeout(() => {
        t.style.opacity = '0'
        t.style.transform = 'translateX(-50%) translateY(20px)'
      }, 3000)
    }
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => { window.location.href = '/auth/signup?email=' + encodeURIComponent(email) }, 1800)
  }

  const toast = (
    <div
      ref={toastRef}
      style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%) translateY(20px)', background: '#131B2E', border: '1px solid rgba(16,185,129,.3)', color: '#F0F4F8', padding: '14px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.4)', opacity: 0, transition: 'opacity .3s,transform .3s', zIndex: 400, whiteSpace: 'nowrap', pointerEvents: 'none' }}
    >
      ✓ You&apos;re on the list! Redirecting to the app…
    </div>
  )

  if (variant === 'final') {
    return (
      <>
        <div className="final-form">
          <input
            ref={inputRef}
            type="email"
            className="final-form-input"
            placeholder="your@email.com"
            onKeyDown={e => { if (e.key === 'Enter') handleSignup() }}
          />
          <button className="btn-signup" onClick={handleSignup}>Get started free →</button>
        </div>
        {toast}
      </>
    )
  }

  return (
    <>
      <div className="signup-box">
        <div className="signup-box-label">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>
          First 100 users get Pro free for 1 month
        </div>
        <div className="form-row">
          <input
            ref={inputRef}
            type="email"
            className="form-input"
            placeholder="your@email.com"
            onKeyDown={e => { if (e.key === 'Enter') handleSignup() }}
          />
          <button className="btn-signup" onClick={handleSignup}>
            Get started free
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </button>
        </div>
        <div className="form-trust">
          <span>✓ No credit card</span>
          <span className="form-trust-div">·</span>
          <span>✓ No setup needed</span>
          <span className="form-trust-div">·</span>
          <span>✓ Your data stays private</span>
        </div>
      </div>
      {toast}
    </>
  )
}
