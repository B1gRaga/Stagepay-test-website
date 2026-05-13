'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Archivo',sans-serif;background:#060A12;color:#F8FAFC}
  @keyframes spin{to{transform:rotate(360deg)}}
  .mfa-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#060A12;position:relative;overflow:hidden}
  .mfa-page::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px);background-size:28px 28px;pointer-events:none;z-index:0}
  .mfa-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0;background:radial-gradient(circle,rgba(16,185,129,.12) 0%,transparent 65%);filter:blur(60px);width:500px;height:500px;top:-100px;left:-100px}
  .mfa-box{background:rgba(13,20,35,.98);border:1px solid rgba(16,185,129,.15);border-radius:20px;padding:44px 48px;width:100%;max-width:420px;position:relative;z-index:1}
  .mfa-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#F8FAFC;display:flex;align-items:center;gap:10px;margin-bottom:32px}
  .mfa-logo em{color:#10B981;font-style:normal}
  .mfa-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#F8FAFC;margin-bottom:4px}
  .mfa-sub{font-size:12px;color:rgba(248,250,252,.4);margin-bottom:28px}
  .mfa-digits{display:flex;gap:10px;justify-content:center;margin-bottom:24px}
  .mfa-digit{
    width:44px;height:52px;border-radius:10px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
    font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;
    color:#F8FAFC;text-align:center;outline:none;
    transition:border-color .2s,box-shadow .2s;caret-color:transparent;
  }
  .mfa-digit:focus{border-color:rgba(16,185,129,.5);box-shadow:0 0 0 3px rgba(16,185,129,.1)}
  .mfa-btn{
    background:linear-gradient(135deg,#10B981,#059669);color:#000;padding:13px;border-radius:8px;border:none;
    font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;
    transition:all .2s;width:100%;font-family:'Archivo',sans-serif;
    box-shadow:0 4px 20px rgba(16,185,129,.3);display:flex;align-items:center;justify-content:center;gap:8px;
  }
  .mfa-btn:disabled{opacity:.5;cursor:not-allowed}
  .mfa-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#F87171;margin-bottom:16px}
  .mfa-back{font-size:12px;color:rgba(248,250,252,.3);text-align:center;margin-top:20px}
  .mfa-back a{color:#10B981;text-decoration:none}
  .mfa-back a:hover{text-decoration:underline}
`

export default function MfaPage() {
  const [digits,  setDigits]  = useState(['', '', '', '', '', ''])
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null))

  const code = digits.join('')

  useEffect(() => { refs[0].current?.focus() }, [])

  function handleDigit(idx: number, val: string) {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = ch
    setDigits(next)
    if (ch && idx < 5) refs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      refs[5].current?.focus()
      e.preventDefault()
    }
  }

  async function verify() {
    if (code.length !== 6) return
    setLoading(true); setError('')
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (!totp) { setError('No authenticator found. Please re-enroll 2FA in Settings.'); return }

      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed'); return }

      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.id, code })
      if (vErr) { setError('Invalid code. Please try again.'); setDigits(['','','','','','']); refs[0].current?.focus() }
      else window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (code.length === 6) verify() }, [code])

  return (
    <>
      <style>{CSS}</style>
      <div className="mfa-page">
        <div className="mfa-orb"/>
        <div className="mfa-box">
          <div className="mfa-logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
              <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            Stage<em>Pay</em>
          </div>

          <div className="mfa-title">Two-factor auth</div>
          <div className="mfa-sub">Enter the 6-digit code from your authenticator app</div>

          {error && <div className="mfa-error">{error}</div>}

          <div className="mfa-digits" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                className="mfa-digit"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
              />
            ))}
          </div>

          <button className="mfa-btn" disabled={code.length !== 6 || loading} onClick={verify}>
            {loading
              ? <><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(0,0,0,.25)',borderTopColor:'#000',animation:'spin .6s linear infinite',display:'inline-block'}}/> Verifying…</>
              : 'Verify code'}
          </button>

          <div className="mfa-back">
            <a href="/auth/login">← Back to login</a>
          </div>
        </div>
      </div>
    </>
  )
}
