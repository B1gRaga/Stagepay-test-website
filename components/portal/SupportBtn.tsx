'use client'
import { useState } from 'react'

const CSS = `
  .support-fab{
    position:fixed;bottom:24px;right:24px;z-index:900;
    width:48px;height:48px;border-radius:50%;
    background:#10B981;color:#0F172A;
    border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 18px rgba(16,185,129,.45),0 4px 14px rgba(0,0,0,.25);
    transition:transform .15s,box-shadow .15s;
  }
  .support-fab:hover{
    transform:scale(1.08);
    box-shadow:0 0 28px rgba(16,185,129,.65),0 6px 20px rgba(0,0,0,.3);
  }
  @media(max-width:768px){
    .support-fab{bottom:80px;right:16px;}
  }

  .support-panel{
    position:fixed;bottom:82px;right:24px;z-index:900;
    width:290px;
    background:var(--bg2,#1E293B);
    border:1px solid var(--line2,rgba(255,255,255,0.11));
    border-radius:14px;
    box-shadow:0 16px 48px rgba(0,0,0,.35);
    overflow:hidden;
    animation:panelIn .18s ease both;
  }
  @keyframes panelIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
  @media(max-width:768px){
    .support-panel{bottom:136px;right:16px;width:calc(100vw - 32px);}
  }
  .support-panel-header{
    padding:14px 18px 12px;
    border-bottom:1px solid var(--line,rgba(255,255,255,0.06));
    display:flex;align-items:center;gap:10px;
  }
  .support-panel-title{
    font-size:13px;font-weight:600;
    color:var(--t1,#F8FAFC);
    font-family:'Archivo',sans-serif;
  }
  .support-panel-sub{
    font-size:11px;color:var(--t3,rgba(248,250,252,0.3));
    margin-top:1px;font-family:'Archivo',sans-serif;
  }
  .support-option{
    display:flex;align-items:center;gap:12px;
    padding:13px 18px;
    border-bottom:1px solid var(--line,rgba(255,255,255,0.06));
    cursor:pointer;background:transparent;border-left:none;border-right:none;border-top:none;
    width:100%;text-align:left;
    transition:background .12s;text-decoration:none;
    font-family:'Archivo',sans-serif;
  }
  .support-option:last-child{border-bottom:none;}
  .support-option:hover{background:var(--surface,#263244);}
  .support-option-icon{
    width:34px;height:34px;border-radius:8px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
  }
  .support-option-label{font-size:13px;font-weight:500;color:var(--t1,#F8FAFC);}
  .support-option-desc{font-size:11px;color:var(--t3,rgba(248,250,252,0.3));margin-top:1px;}

  html[data-theme="light"] .support-panel{
    background:#FFFFFF;
    border-color:rgba(15,23,42,0.14);
  }
  html[data-theme="light"] .support-panel-header{border-color:rgba(15,23,42,0.08);}
  html[data-theme="light"] .support-option{border-color:rgba(15,23,42,0.08);}
  html[data-theme="light"] .support-option:hover{background:#F1F5F9;}
  html[data-theme="light"] .support-option-label{color:#0F172A;}
  html[data-theme="light"] .support-option-desc{color:rgba(15,23,42,0.38);}
  html[data-theme="light"] .support-panel-title{color:#0F172A;}
  html[data-theme="light"] .support-panel-sub{color:rgba(15,23,42,0.38);}
`

export default function SupportBtn() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <style>{CSS}</style>

      {open && (
        <>
          {/* Click-away overlay */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 899 }} onClick={() => setOpen(false)} />

          <div className="support-panel">
            <div className="support-panel-header">
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="#10B981"/>
                </svg>
              </div>
              <div>
                <div className="support-panel-title">StagePay Support</div>
                <div className="support-panel-sub">We typically reply within a few hours</div>
              </div>
            </div>

            <a
              href="mailto:support@stagepay.co.bw?subject=StagePay Support Request"
              className="support-option"
              onClick={() => setOpen(false)}
            >
              <div className="support-option-icon" style={{ background: 'rgba(59,130,246,.1)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3B82F6" strokeWidth="1.5">
                  <rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 6l7 4 7-4"/>
                </svg>
              </div>
              <div>
                <div className="support-option-label">Email support</div>
                <div className="support-option-desc">support@stagepay.co.bw</div>
              </div>
            </a>

            <a
              href="https://wa.me/26771234567?text=Hi%2C%20I%20need%20help%20with%20StagePay"
              target="_blank"
              rel="noopener noreferrer"
              className="support-option"
              onClick={() => setOpen(false)}
            >
              <div className="support-option-icon" style={{ background: 'rgba(37,211,102,.1)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#25D366">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/>
                </svg>
              </div>
              <div>
                <div className="support-option-label">WhatsApp us</div>
                <div className="support-option-desc">Quick questions &amp; help</div>
              </div>
            </a>
          </div>
        </>
      )}

      <button className="support-fab" onClick={() => setOpen(p => !p)} title="Get support">
        {open ? (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l12 12M14 2L2 14"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>
          </svg>
        )}
      </button>
    </>
  )
}
