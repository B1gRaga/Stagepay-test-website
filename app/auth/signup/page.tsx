'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FEATURES = [
  'AI invoice generation in seconds',
  'WhatsApp PDF delivery to clients',
  'Multi-currency · Pula, Rand, USD+',
  'Automated payment reminders',
]

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--font-archivo),sans-serif;background:#ede6d8}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(24px,-18px) scale(1.06)}70%{transform:translate(-12px,14px) scale(.96)}}
  @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-20px,22px) scale(1.04)}66%{transform:translate(16px,-10px) scale(.97)}}
  @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes featIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
  @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

  .auth-page{
    min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;
    background:linear-gradient(145deg,#f3ede1 0%,#ede5d4 55%,#e2d8c6 100%);
    position:relative;overflow:hidden;
  }
  .auth-page::before{
    content:'';position:absolute;inset:0;
    background-image:radial-gradient(circle,rgba(26,20,10,.07) 1px,transparent 1px);
    background-size:32px 32px;pointer-events:none;z-index:0;
  }
  .auth-page::after{
    content:'STAGEPAY';
    position:absolute;bottom:-40px;right:-20px;
    font-family:var(--font-bebas),sans-serif;font-size:180px;letter-spacing:8px;
    color:rgba(26,20,10,.04);pointer-events:none;user-select:none;line-height:1;z-index:0;
  }
  .auth-wrap{
    display:grid;grid-template-columns:1fr 1fr;
    width:100%;max-width:980px;height:610px;
    border-radius:22px;overflow:hidden;
    box-shadow:0 40px 100px rgba(26,18,8,.22),0 0 0 1px rgba(26,18,8,.08),0 2px 0 rgba(255,255,255,.5) inset;
    position:relative;z-index:1;
  }
  @media(max-width:768px){.auth-wrap{grid-template-columns:1fr;height:auto;min-height:100vh;border-radius:0;box-shadow:none;}}

  .auth-left{
    background:linear-gradient(155deg,#0a1a2e 0%,#0F172A 48%,#071610 100%);
    padding:48px 44px;display:flex;flex-direction:column;justify-content:space-between;
    border-right:1px solid rgba(255,255,255,.04);position:relative;overflow:hidden;
  }
  @media(max-width:768px){.auth-left{display:none;}}
  .orb{position:absolute;border-radius:50%;filter:blur(55px);pointer-events:none;}
  .orb-1{width:340px;height:340px;top:-100px;right:-100px;background:radial-gradient(circle,rgba(16,185,129,.2) 0%,transparent 65%);animation:orbFloat1 12s ease-in-out infinite;}
  .orb-2{width:240px;height:240px;bottom:50px;left:-70px;background:radial-gradient(circle,rgba(243,237,225,.06) 0%,transparent 65%);animation:orbFloat2 9s ease-in-out infinite;animation-delay:-4s;}
  .auth-grid{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 48px);pointer-events:none;}
  .auth-left::before{content:'STAGEPAY';position:absolute;bottom:-14px;left:-6px;font-family:var(--font-bebas),sans-serif;font-size:120px;letter-spacing:5px;color:rgba(16,185,129,.06);pointer-events:none;user-select:none;line-height:1;}
  .auth-logo{font-family:var(--font-bebas),sans-serif;font-size:24px;letter-spacing:3px;color:#F8FAFC;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
  .auth-logo em{color:#10B981;font-style:normal;}
  .auth-tagline{font-family:var(--font-instrument),serif;font-style:italic;font-size:30px;line-height:1.2;color:#F8FAFC;}
  .auth-tagline strong{color:#10B981;font-style:normal;font-family:var(--font-bebas),sans-serif;letter-spacing:2px;font-size:36px;display:block;}
  .auth-card{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:14px;padding:20px 22px;position:relative;z-index:1;backdrop-filter:blur(8px);box-shadow:0 14px 36px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);animation:cardFloat 5s ease-in-out infinite;}
  .auth-badge{display:inline-block;background:rgba(16,185,129,.2);color:#10B981;font-size:9px;font-weight:700;letter-spacing:.1em;padding:3px 10px;border-radius:20px;text-transform:uppercase;}
  .auth-feats{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1;}
  .auth-feat{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(248,250,252,.45);}
  .auth-feat:nth-child(1){animation:featIn .5s .05s both;}
  .auth-feat:nth-child(2){animation:featIn .5s .12s both;}
  .auth-feat:nth-child(3){animation:featIn .5s .19s both;}
  .auth-feat:nth-child(4){animation:featIn .5s .26s both;}
  .auth-dot{width:5px;height:5px;border-radius:50%;background:#10B981;flex-shrink:0;box-shadow:0 0 6px rgba(16,185,129,.5);}

  .auth-right{background:#faf7f2;padding:44px 48px;display:flex;flex-direction:column;overflow-y:auto;}
  @media(max-width:480px){.auth-right{padding:32px 24px;background:#f3ede1;}}

  .auth-tabs{display:flex;gap:4px;margin-bottom:28px;background:rgba(26,20,10,.06);border:1px solid rgba(26,20,10,.1);border-radius:10px;padding:4px;}
  .auth-tab{flex:1;padding:9px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .18s;color:rgba(26,20,10,.35);background:transparent;border:none;border-radius:7px;font-family:var(--font-archivo),sans-serif;text-decoration:none;display:block;}
  .auth-tab.active{background:linear-gradient(135deg,#10B981,#059669);color:#fff;box-shadow:0 2px 12px rgba(16,185,129,.3);}
  .auth-tab:not(.active):hover{color:rgba(26,20,10,.7);background:rgba(26,20,10,.05);}

  .auth-title{font-family:var(--font-bebas),sans-serif;font-size:24px;letter-spacing:2.5px;color:#1a1a1a;margin-bottom:3px;}
  .auth-sub{font-size:12px;color:rgba(26,20,10,.4);margin-bottom:10px;}
  .auth-divider{height:1px;background:rgba(26,20,10,.08);margin:0 0 18px;}
  .auth-group{display:flex;flex-direction:column;gap:6px;}
  .auth-group label{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:rgba(26,20,10,.45);font-weight:600;}
  .auth-input{background:#fff;border:1px solid rgba(26,20,10,.14);border-radius:8px;padding:12px 15px;font-family:var(--font-archivo),sans-serif;font-size:13px;color:#1a1a1a;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
  .auth-input:focus{border-color:rgba(16,185,129,.5);box-shadow:0 0 0 3px rgba(16,185,129,.1);}
  .auth-input::placeholder{color:rgba(26,20,10,.28);}
  .auth-btn{background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:13px;border-radius:8px;border:none;font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font-family:var(--font-archivo),sans-serif;box-shadow:0 4px 20px rgba(16,185,129,.3);position:relative;overflow:hidden;}
  .auth-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transform:translateX(-100%);transition:transform .5s;}
  .auth-btn:hover:not(:disabled)::after{transform:translateX(100%);}
  .auth-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,.4);}
  .auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .auth-error{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:8px;padding:10px 14px;font-size:12px;color:#dc2626;margin-bottom:4px;}
  .auth-footer{font-size:12px;color:rgba(26,20,10,.35);text-align:center;margin-top:auto;padding-top:20px;}
  .auth-footer a{color:#059669;text-decoration:none;}
  .auth-footer a:hover{text-decoration:underline;}

  /* Business type tiles — step 2 */
  .biz-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 4px;}
  .biz-tile{
    padding:14px 10px;border-radius:10px;border:1.5px solid rgba(26,20,10,.12);
    background:#fff;cursor:pointer;transition:all .15s;
    display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;
  }
  .biz-tile:hover{border-color:rgba(16,185,129,.4);background:#f0fbf6;}
  .biz-tile.selected{border-color:#10B981;background:#f0fbf6;box-shadow:0 0 0 3px rgba(16,185,129,.1);}
  .biz-tile-icon{font-size:22px;line-height:1;}
  .biz-tile-label{font-size:11px;font-weight:600;color:#1a1a1a;letter-spacing:.02em;}
`

const LeftPanel = () => (
  <div className="auth-left">
    <div className="auth-grid"/>
    <div className="orb orb-1"/>
    <div className="orb orb-2"/>
    <div className="auth-logo">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
        <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
        <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
        <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
      </svg>
      Stage<em>Pay</em>
    </div>
    <div style={{position:'relative',zIndex:1}}>
      <div className="auth-tagline">Start sending<br/><strong>INVOICES TODAY.</strong></div>
      <div style={{width:40,height:2,background:'linear-gradient(90deg,#10B981,transparent)',margin:'16px 0 20px',borderRadius:1}}/>
      <div className="auth-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontFamily:"var(--font-bebas),sans-serif",fontSize:12,letterSpacing:2,color:'rgba(255,255,255,.4)'}}>INVOICE · INV-047</div>
          <span className="auth-badge">Paid</span>
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>Molapo Tower Ltd.</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginBottom:16}}>Structural Assessment · Phase 2</div>
        <div style={{height:1,background:'rgba(255,255,255,.06)',marginBottom:14}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:10,color:'rgba(255,255,255,.3)',letterSpacing:'.06em',textTransform:'uppercase'}}>Total due</span>
          <span style={{fontFamily:"var(--font-bebas),sans-serif",fontSize:26,letterSpacing:1,color:'#10B981',textShadow:'0 0 20px rgba(16,185,129,.3)'}}>P 24,500</span>
        </div>
      </div>
    </div>
    <div className="auth-feats">
      {FEATURES.map(f => (
        <div key={f} className="auth-feat"><div className="auth-dot"/>{f}</div>
      ))}
    </div>
  </div>
)

const BUSINESS_TYPES = [
  { value: 'tuition_centre', label: 'Tuition Centre' },
  { value: 'contractor',     label: 'Contractor' },
  { value: 'freelancer',     label: 'Freelancer' },
  { value: 'salon',          label: 'Salon' },
  { value: 'agency',         label: 'Agency' },
  { value: 'other',          label: 'Other' },
]

export default function SignupPage() {
  const [step, setStep]                 = useState<1 | 2>(1)
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pre = params.get('email')
    if (pre) setEmail(pre)
  }, [])
  const [businessType, setBusinessType] = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)

  async function handleStepOne(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessType) { setError('Please select your business type'); return }
    setLoading(true); setError('')

    try {
      const hibp = await fetch('/api/auth/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const { pwned } = await hibp.json()
      if (pwned) {
        setError('This password has appeared in a known data breach. Please choose a different password.')
        setLoading(false)
        setStep(1)
        return
      }
    } catch {
      // HIBP check failed — continue with sign-up
    }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim(), business_type: businessType } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else if (data.session) window.location.href = '/dashboard'
    else setDone(true)
  }

  if (done) {
    return (
      <>
        <style>{CSS}</style>
        <div className="auth-page">
          <div className="auth-wrap">
            <LeftPanel/>
            <div className="auth-right" style={{alignItems:'center',justifyContent:'center',textAlign:'center',gap:16}}>
              <div style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg,#10B981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',animation:'successPop .4s cubic-bezier(.34,1.56,.64,1) both',boxShadow:'0 8px 24px rgba(16,185,129,.35)'}}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="auth-title" style={{marginTop:8}}>Check your email</div>
              <p style={{fontSize:13,color:'rgba(248,250,252,.4)',lineHeight:1.7,maxWidth:260}}>
                We sent a confirmation link to <strong style={{color:'#F8FAFC'}}>{email}</strong>. Click it to activate your account.
              </p>
              <Link href="/auth/login" className="auth-btn" style={{textDecoration:'none',marginTop:8,maxWidth:260}}>
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="auth-page">
        <div className="auth-wrap">
          <LeftPanel/>
          <div className="auth-right">
            <div className="auth-tabs">
              <Link href="/auth/login" className="auth-tab">Log in</Link>
              <span className="auth-tab active">Create account</span>
            </div>

            <div className="auth-title">Create your account</div>
            <div className="auth-sub">Free forever — no credit card needed</div>
            <div className="auth-divider"/>

            {error && <div className="auth-error">{error}</div>}

            {step === 1 ? (
              <form onSubmit={handleStepOne} style={{display:'flex',flexDirection:'column',gap:14,flex:1}}>
                <div className="auth-group">
                  <label>Full name</label>
                  <input className="auth-input" type="text" required autoComplete="name"
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Jane Smith"/>
                </div>
                <div className="auth-group">
                  <label>Email address</label>
                  <input className="auth-input" type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourfirm.co.bw"/>
                </div>
                <div className="auth-group">
                  <label>Password</label>
                  <div style={{position:'relative'}}>
                    <input className="auth-input" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" style={{paddingRight:44}}/>
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',cursor:'pointer',padding:0,color:'rgba(248,250,252,.3)',display:'flex',alignItems:'center'}}>
                      {showPw
                        ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l12 12M6.5 6.6A2 2 0 0010.4 9.5M4.1 4.2A7 7 0 001 8s2.4 5 7 5a6.8 6.8 0 003.9-1.2M6 3.1A6.8 6.8 0 0115 8s-.9 2-2.4 3.3"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 8s2.4-5 7-5 7 5 7 5-2.4 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                      }
                    </button>
                  </div>
                </div>
                <button type="submit" className="auth-btn" style={{marginTop:'auto'}}>
                  Continue <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14,flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <button type="button" onClick={() => { setStep(1); setError('') }}
                    style={{background:'transparent',border:'none',color:'rgba(248,250,252,.3)',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M13 8H3M7 4l-4 4 4 4"/></svg>
                    Back
                  </button>
                  <span style={{fontSize:11,color:'rgba(248,250,252,.2)'}}>Step 2 of 2</span>
                </div>
                <div className="auth-group">
                  <label>What type of business are you?</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
                    {BUSINESS_TYPES.map(bt => (
                      <button key={bt.value} type="button"
                        onClick={() => setBusinessType(bt.value)}
                        style={{
                          padding:'10px 12px',borderRadius:8,border:'1px solid',
                          borderColor: businessType === bt.value ? '#10B981' : 'rgba(255,255,255,.08)',
                          background: businessType === bt.value ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.03)',
                          color: businessType === bt.value ? '#10B981' : 'rgba(248,250,252,.5)',
                          fontSize:12,fontWeight:600,cursor:'pointer',
                          fontFamily:'var(--font-archivo),sans-serif',
                          transition:'all .15s',textAlign:'left',
                        }}>
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading || !businessType} className="auth-btn" style={{marginTop:'auto'}}>
                  {loading
                    ? <><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(0,0,0,.25)',borderTopColor:'#000',animation:'spin .6s linear infinite',display:'inline-block'}}/> Creating account…</>
                    : <>Create free account <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
                </button>
              </form>
            )}

            <div className="auth-footer">
              Already have an account? <Link href="/auth/login">Sign in →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
