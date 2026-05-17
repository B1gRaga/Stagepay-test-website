'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BUSINESS_TYPES = [
  { value: 'tuition_centre', label: 'Tuition Centre',  icon: '🎓' },
  { value: 'contractor',     label: 'Contractor',       icon: '🔧' },
  { value: 'freelancer',     label: 'Freelancer',       icon: '💻' },
  { value: 'salon',          label: 'Salon',            icon: '✂️' },
  { value: 'agency',         label: 'Agency',           icon: '🏢' },
  { value: 'other',          label: 'Other',            icon: '⚡' },
]

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .ob-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0F172A;}
  .ob-card{width:100%;max-width:480px;background:rgba(13,20,35,.98);border:1px solid rgba(16,185,129,.12);border-radius:18px;padding:40px 36px;animation:fadeUp .35s ease both;}
  @media(max-width:480px){.ob-card{padding:28px 20px;border-radius:12px;}}
  .ob-logo{font-family:var(--font-bebas),sans-serif;font-size:20px;letter-spacing:3px;color:#F8FAFC;display:flex;align-items:center;gap:8px;margin-bottom:32px;}
  .ob-logo em{color:#10B981;font-style:normal;}
  .ob-heading{font-family:var(--font-bebas),sans-serif;font-size:26px;letter-spacing:2px;color:#F8FAFC;margin-bottom:8px;}
  .ob-sub{font-size:13px;color:rgba(248,250,252,.4);line-height:1.6;margin-bottom:28px;}
  .ob-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;}
  @media(max-width:360px){.ob-grid{grid-template-columns:1fr;}}
  .ob-tile{
    padding:14px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.03);cursor:pointer;transition:all .15s;
    font-family:var(--font-archivo),sans-serif;font-size:13px;font-weight:600;
    color:rgba(248,250,252,.55);text-align:left;display:flex;align-items:center;gap:10px;
  }
  .ob-tile:hover{border-color:rgba(16,185,129,.4);color:rgba(248,250,252,.85);}
  .ob-tile.selected{border-color:#10B981;background:rgba(16,185,129,.1);color:#10B981;}
  .ob-tile-icon{font-size:18px;flex-shrink:0;}
  .ob-btn{
    width:100%;background:linear-gradient(135deg,#10B981,#059669);color:#000;
    padding:13px;border-radius:8px;border:none;font-size:13px;font-weight:700;
    letter-spacing:.07em;text-transform:uppercase;cursor:pointer;transition:all .2s;
    display:flex;align-items:center;justify-content:center;gap:8px;
    font-family:var(--font-archivo),sans-serif;box-shadow:0 4px 20px rgba(16,185,129,.3);
  }
  .ob-btn:disabled{opacity:.45;cursor:not-allowed;}
  .ob-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,.4);}
  .ob-skip{display:block;text-align:center;margin-top:14px;font-size:12px;color:rgba(248,250,252,.25);cursor:pointer;background:transparent;border:none;font-family:var(--font-archivo),sans-serif;}
  .ob-skip:hover{color:rgba(248,250,252,.5);}
  .ob-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#F87171;margin-bottom:16px;}
`

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!selected) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_type: selected }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save') }
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ob-page">
        <div className="ob-card">
          <div className="ob-logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
              <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            Stage<em>Pay</em>
          </div>

          <div className="ob-heading">One quick question</div>
          <div className="ob-sub">What type of business do you run? This helps us personalise your experience.</div>

          {error && <div className="ob-error">{error}</div>}

          <div className="ob-grid">
            {BUSINESS_TYPES.map(bt => (
              <button
                key={bt.value}
                className={`ob-tile${selected === bt.value ? ' selected' : ''}`}
                onClick={() => setSelected(bt.value)}
              >
                <span className="ob-tile-icon">{bt.icon}</span>
                {bt.label}
              </button>
            ))}
          </div>

          <button className="ob-btn" disabled={!selected || loading} onClick={handleSave}>
            {loading
              ? <><span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(0,0,0,.25)',borderTopColor:'#000',animation:'spin .6s linear infinite',display:'inline-block'}}/> Saving…</>
              : <>Continue to dashboard <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>
            }
          </button>

          <button className="ob-skip" onClick={() => router.push('/dashboard')}>
            Skip for now
          </button>
        </div>
      </div>
    </>
  )
}
