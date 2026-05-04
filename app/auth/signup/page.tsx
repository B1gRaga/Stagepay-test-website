'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
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
  @keyframes successPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

  .auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#060A12}
  .auth-wrap{
    display:grid;grid-template-columns:1fr 1fr;
    width:100%;max-width:900px;height:580px;
    border:1px solid rgba(16,185,129,.15);border-radius:16px;overflow:hidden;
    box-shadow:0 40px 80px rgba(0,0,0,.6);
  }
  @media(max-width:768px){.auth-wrap{grid-template-columns:1fr;height:auto;min-height:100vh;border-radius:0;border:none;box-shadow:none;}}

  .auth-left{
    background:linear-gradient(155deg,#0d1f3c 0%,#0F172A 45%,#081e12 100%);
    padding:48px 44px;
    display:flex;flex-direction:column;justify-content:space-between;
    border-right:1px solid rgba(16,185,129,.15);
    position:relative;overflow:hidden;
  }
  @media(max-width:768px){.auth-left{display:none;}}
  .auth-left::before{
    content:'STAGEPAY';
    position:absolute;bottom:-20px;left:-10px;
    font-family:'Bebas Neue',sans-serif;
    font-size:130px;letter-spacing:4px;
    color:rgba(16,185,129,.06);
    pointer-events:none;user-select:none;line-height:1;
  }
  .auth-left::after{
    content:'';
    position:absolute;bottom:-90px;right:-90px;
    width:300px;height:300px;border-radius:50%;
    background:radial-gradient(circle,rgba(16,185,129,.22) 0%,transparent 65%);
    pointer-events:none;
  }
  .auth-grid{
    position:absolute;inset:0;
    background-image:
      repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 44px),
      repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 44px);
    pointer-events:none;
  }
  .auth-logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#F8FAFC;display:flex;align-items:center;gap:10px;position:relative;z-index:1;}
  .auth-logo em{color:#10B981;font-style:normal;}
  .auth-tagline{font-family:'Instrument Serif',serif;font-style:italic;font-size:30px;line-height:1.2;color:#F8FAFC;}
  .auth-tagline strong{color:#10B981;font-style:normal;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:36px;display:block;}
  .auth-card{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:18px 20px;position:relative;z-index:1;}
  .auth-badge{display:inline-block;background:rgba(16,185,129,.2);color:#10B981;font-size:9px;font-weight:700;letter-spacing:.1em;padding:3px 9px;border-radius:20px;text-transform:uppercase;}
  .auth-feats{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1;}
  .auth-feat{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(248,250,252,.55);}
  .auth-dot{width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0;}

  .auth-right{background:#0F172A;padding:40px 44px;display:flex;flex-direction:column;overflow-y:auto;}
  .auth-tabs{display:flex;gap:4px;margin-bottom:28px;background:#1E293B;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:4px;}
  .auth-tab{flex:1;padding:9px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .18s;color:rgba(248,250,252,.4);background:transparent;border:none;border-radius:6px;font-family:'Archivo',sans-serif;text-decoration:none;display:block;}
  .auth-tab.active{background:#10B981;color:#000;box-shadow:0 2px 8px rgba(16,185,129,.3);}
  .auth-tab:not(.active):hover{color:#F8FAFC;background:rgba(255,255,255,.06);}

  .auth-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#F8FAFC;margin-bottom:2px;}
  .auth-sub{font-size:12px;color:rgba(248,250,252,.4);margin-bottom:8px;}
  .auth-group{display:flex;flex-direction:column;gap:5px;}
  .auth-group label{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:rgba(248,250,252,.45);font-weight:600;}
  .auth-input{background:#1E293B;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:11px 14px;font-family:'Archivo',sans-serif;font-size:13px;color:#F8FAFC;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
  .auth-input:focus{border-color:rgba(16,185,129,.5);box-shadow:0 0 0 3px rgba(16,185,129,.08);}
  .auth-input::placeholder{color:rgba(248,250,252,.3);}
  .auth-btn{background:#10B981;color:#000;padding:13px;border-radius:7px;border:none;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;font-family:'Archivo',sans-serif;box-shadow:0 4px 16px rgba(16,185,129,.25);}
  .auth-btn:hover:not(:disabled){background:#22e060;transform:translateY(-1px);}
  .auth-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .auth-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:6px;padding:10px 12px;font-size:12px;color:#F87171;}
  .auth-footer{font-size:12px;color:rgba(248,250,252,.4);text-align:center;margin-top:auto;padding-top:16px;}
  .auth-footer a{color:#10B981;text-decoration:none;}
  .auth-footer a:hover{text-decoration:underline;}
`

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
    else if (data.session) window.location.href = '/app.html'
    else setDone(true)
  }

  const LeftPanel = () => (
    <div className="auth-left">
      <div className="auth-grid"/>
      <div className="auth-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="0"  y="17" width="6" height="15" rx="2" fill="#10B981"/>
          <rect x="9"  y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
          <rect x="18" y="6"  width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
          <rect x="27" y="0"  width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
        </svg>
        Stage<em>Pay</em>
      </div>
      <div style={{position:'relative',zIndex:1}}>
        <div className="auth-tagline">Start sending<br/><strong>INVOICES TODAY.</strong></div>
        <div style={{width:36,height:2,background:'#10B981',margin:'14px 0 18px',borderRadius:1,opacity:.7}}/>
        <div className="auth-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2,color:'rgba(255,255,255,.5)'}}>INVOICE · INV-047</div>
            <span className="auth-badge">Paid</span>
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:2}}>Molapo Tower Ltd.</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.75)',marginBottom:14}}>Structural Assessment · Phase 2</div>
          <div style={{height:1,background:'rgba(255,255,255,.07)',marginBottom:12}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:'.06em',textTransform:'uppercase'}}>Total due</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,color:'#10B981'}}>P 24,500</span>
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

  if (done) {
    return (
      <>
        <style>{CSS}</style>
        <div className="auth-page">
          <div className="auth-wrap">
            <LeftPanel/>
            <div className="auth-right" style={{alignItems:'center',justifyContent:'center',textAlign:'center',gap:14}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'#10B981',display:'flex',alignItems:'center',justifyContent:'center',animation:'successPop .4s cubic-bezier(.34,1.56,.64,1) both'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="auth-title" style={{marginTop:8}}>Check your email</div>
              <p style={{fontSize:13,color:'rgba(248,250,252,.5)',lineHeight:1.7,maxWidth:260}}>
                We sent a confirmation link to <strong style={{color:'#F8FAFC'}}>{email}</strong>. Click it to activate your account.
              </p>
              <Link href="/auth/login" className="auth-btn" style={{textDecoration:'none',marginTop:8}}>
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
                    placeholder="Min. 8 characters" style={{paddingRight:42}}/>
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',cursor:'pointer',fontSize:14,padding:0,color:'rgba(248,250,252,.35)'}}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="auth-btn">
                {loading
                  ? <><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(0,0,0,.2)',borderTopColor:'#000',animation:'spin .6s linear infinite',display:'inline-block'}}/> Creating account…</>
                  : <>Create free account <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
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
