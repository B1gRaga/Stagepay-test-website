'use client'
import { useState } from 'react'
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
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Archivo',sans-serif;background:#060A12}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(24px,-18px) scale(1.06)}70%{transform:translate(-12px,14px) scale(.96)}}
  @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-20px,22px) scale(1.04)}66%{transform:translate(16px,-10px) scale(.97)}}
  @keyframes cardFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes featIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
  @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

  .auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#060A12}
  .auth-wrap{
    display:grid;grid-template-columns:1fr 1fr;
    width:100%;max-width:960px;height:600px;
    border:1px solid rgba(16,185,129,.12);border-radius:20px;overflow:hidden;
    box-shadow:0 50px 100px rgba(0,0,0,.7),0 0 0 1px rgba(16,185,129,.04);
  }
  @media(max-width:768px){.auth-wrap{grid-template-columns:1fr;height:auto;min-height:100vh;border-radius:0;border:none;box-shadow:none;}}

  .auth-left{
    background:linear-gradient(155deg,#0b1d3a 0%,#0F172A 45%,#071812 100%);
    padding:48px 44px;display:flex;flex-direction:column;justify-content:space-between;
    border-right:1px solid rgba(16,185,129,.1);position:relative;overflow:hidden;
  }
  @media(max-width:768px){.auth-left{display:none;}}
  .orb{position:absolute;border-radius:50%;filter:blur(55px);pointer-events:none;}
  .orb-1{width:320px;height:320px;top:-80px;right:-80px;background:radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 65%);animation:orbFloat1 12s ease-in-out infinite;}
  .orb-2{width:220px;height:220px;bottom:60px;left:-60px;background:radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 65%);animation:orbFloat2 9s ease-in-out infinite;animation-delay:-4s;}
  .auth-grid{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.016) 0,rgba(255,255,255,.016) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(255,255,255,.016) 0,rgba(255,255,255,.016) 1px,transparent 1px,transparent 48px);pointer-events:none;}
  .auth-left::before{content:'STAGEPAY';position:absolute;bottom:-18px;left:-8px;font-family:'Bebas Neue',sans-serif;font-size:128px;letter-spacing:6px;color:rgba(16,185,129,.05);pointer-events:none;user-select:none;line-height:1;}
  .auth-logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#F8FAFC;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
  .auth-logo em{color:#10B981;font-style:normal;}
  .auth-tagline{font-family:'Instrument Serif',serif;font-style:italic;font-size:30px;line-height:1.2;color:#F8FAFC;}
  .auth-tagline strong{color:#10B981;font-style:normal;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:36px;display:block;}
  .auth-card{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:14px;padding:20px 22px;position:relative;z-index:1;backdrop-filter:blur(8px);box-shadow:0 12px 32px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.04);animation:cardFloat 5s ease-in-out infinite;}
  .auth-badge{display:inline-block;background:rgba(16,185,129,.2);color:#10B981;font-size:9px;font-weight:700;letter-spacing:.1em;padding:3px 10px;border-radius:20px;text-transform:uppercase;}
  .auth-feats{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1;}
  .auth-feat{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(248,250,252,.5);}
  .auth-feat:nth-child(1){animation:featIn .5s .05s both;}
  .auth-feat:nth-child(2){animation:featIn .5s .12s both;}
  .auth-feat:nth-child(3){animation:featIn .5s .19s both;}
  .auth-feat:nth-child(4){animation:featIn .5s .26s both;}
  .auth-dot{width:5px;height:5px;border-radius:50%;background:#10B981;flex-shrink:0;box-shadow:0 0 6px rgba(16,185,129,.5);}

  .auth-right{background:rgba(13,20,35,.98);padding:44px 48px;display:flex;flex-direction:column;overflow-y:auto;}
  @media(max-width:480px){.auth-right{padding:32px 24px;}}

  .auth-tabs{display:flex;gap:4px;margin-bottom:28px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:4px;}
  .auth-tab{flex:1;padding:9px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .18s;color:rgba(248,250,252,.35);background:transparent;border:none;border-radius:7px;font-family:'Archivo',sans-serif;text-decoration:none;display:block;}
  .auth-tab.active{background:linear-gradient(135deg,#10B981,#059669);color:#000;box-shadow:0 2px 12px rgba(16,185,129,.35);}
  .auth-tab:not(.active):hover{color:rgba(248,250,252,.7);background:rgba(255,255,255,.05);}

  .auth-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2.5px;color:#F8FAFC;margin-bottom:3px;}
  .auth-sub{font-size:12px;color:rgba(248,250,252,.35);margin-bottom:10px;}
  .auth-divider{height:1px;background:rgba(255,255,255,.06);margin:0 0 18px;}
  .auth-group{display:flex;flex-direction:column;gap:6px;}
  .auth-group label{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:rgba(248,250,252,.4);font-weight:600;}
  .auth-input{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px 15px;font-family:'Archivo',sans-serif;font-size:13px;color:#F8FAFC;outline:none;transition:border-color .2s,box-shadow .2s,background .2s;width:100%;}
  .auth-input:focus{background:rgba(255,255,255,.06);border-color:rgba(16,185,129,.45);box-shadow:0 0 0 3px rgba(16,185,129,.08),inset 0 1px 0 rgba(255,255,255,.03);}
  .auth-input::placeholder{color:rgba(248,250,252,.22);}
  .auth-btn{background:linear-gradient(135deg,#10B981,#059669);color:#000;padding:13px;border-radius:8px;border:none;font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font-family:'Archivo',sans-serif;box-shadow:0 4px 20px rgba(16,185,129,.3);position:relative;overflow:hidden;}
  .auth-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transform:translateX(-100%);transition:transform .5s;}
  .auth-btn:hover:not(:disabled)::after{transform:translateX(100%);}
  .auth-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,.4);}
  .auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .auth-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#F87171;margin-bottom:4px;}
  .auth-footer{font-size:12px;color:rgba(248,250,252,.3);text-align:center;margin-top:auto;padding-top:20px;}
  .auth-footer a{color:#10B981;text-decoration:none;}
  .auth-footer a:hover{text-decoration:underline;}
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
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:'rgba(255,255,255,.4)'}}>INVOICE · INV-047</div>
          <span className="auth-badge">Paid</span>
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>Molapo Tower Ltd.</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginBottom:16}}>Structural Assessment · Phase 2</div>
        <div style={{height:1,background:'rgba(255,255,255,.06)',marginBottom:14}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:10,color:'rgba(255,255,255,.3)',letterSpacing:'.06em',textTransform:'uppercase'}}>Total due</span>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,color:'#10B981',textShadow:'0 0 20px rgba(16,185,129,.3)'}}>P 24,500</span>
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

export default function SignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name.trim() } },
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

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14,flex:1}}>
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
              <button type="submit" disabled={loading} className="auth-btn">
                {loading
                  ? <><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(0,0,0,.25)',borderTopColor:'#000',animation:'spin .6s linear infinite',display:'inline-block'}}/> Creating account…</>
                  : <>Create free account <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link href="/auth/login">Sign in →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
