'use client'
import { useEffect, useState } from 'react'

// The help panel has no button of its own: "Help & support" in the sidebar
// (and the phone account menu) opens it.
const EVENT = 'sp:support'
export function openSupport() { window.dispatchEvent(new Event(EVENT)) }

const CSS = `
  .support-panel{
    position:fixed;bottom:16px;left:248px;z-index:1100;
    width:300px;padding:4px;
    background:var(--bg2,#1F2A44);
    border:1px solid var(--line2,rgba(255,255,255,0.11));
    border-radius:14px;
    box-shadow:0 16px 48px rgba(0,0,0,.28);
    animation:panelIn .18s ease both;
    font-family:var(--font-manrope),sans-serif;
  }
  @keyframes panelIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @media(max-width:768px){
    .support-panel{left:12px;right:12px;width:auto;bottom:calc(70px + env(safe-area-inset-bottom,0px));}
  }
  .support-panel-header{padding:12px 12px 10px;}
  .support-panel-title{font-size:14px;font-weight:700;color:var(--t1,#FAF7F0);}
  .support-panel-sub{font-size:12px;font-weight:500;color:var(--t2,rgba(250,247,240,0.6));margin-top:2px;}
  .support-option{
    display:flex;align-items:center;gap:12px;
    padding:10px 12px;border-radius:10px;
    width:100%;text-align:left;text-decoration:none;
    transition:background .12s;
  }
  .support-option:hover{background:var(--surface,#2B3756);}
  .support-option:focus-visible{outline:2px solid var(--g,#F2A900);outline-offset:-2px}
  .support-option-icon{width:32px;height:32px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--surface,#2B3756);color:var(--t1,#FAF7F0)}
  .support-option:hover .support-option-icon{background:var(--bg2,#1F2A44)}
  .support-option-label{font-size:13px;font-weight:700;color:var(--t1,#FAF7F0);}
  .support-option-desc{font-size:12px;color:var(--t3,rgba(250,247,240,0.3));margin-top:1px;}
`

export default function SupportBtn() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => setOpen(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener(EVENT, show)
    document.addEventListener('keydown', onKey)
    return () => { window.removeEventListener(EVENT, show); document.removeEventListener('keydown', onKey) }
  }, [])

  if (!open) return null
  return (
    <>
      <style>{CSS}</style>

      {/* Click-away overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={() => setOpen(false)} />

      <div className="support-panel" role="dialog" aria-label="Help and support">
        <div className="support-panel-header">
          <div className="support-panel-title">Need a hand?</div>
          <div className="support-panel-sub">We usually reply within a few hours.</div>
        </div>

        <a
          href="https://wa.me/26773998627?text=Hi%2C%20I%20need%20help%20with%20StagePay"
          target="_blank"
          rel="noopener noreferrer"
          className="support-option"
          onClick={() => setOpen(false)}
          autoFocus
        >
          <div className="support-option-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#25A35A" aria-hidden="true">
              <path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/>
            </svg>
          </div>
          <div>
            <div className="support-option-label">WhatsApp us</div>
            <div className="support-option-desc">73 998 627 · quickest for questions</div>
          </div>
        </a>

        <a
          href="mailto:getstagepay@gmail.com?subject=StagePay Support Request"
          className="support-option"
          onClick={() => setOpen(false)}
        >
          <div className="support-option-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="1.5" y="3" width="13" height="10" rx="2"/><path d="M1.5 5.5 8 9.5l6.5-4"/>
            </svg>
          </div>
          <div>
            <div className="support-option-label">Email support</div>
            <div className="support-option-desc">getstagepay@gmail.com</div>
          </div>
        </a>
      </div>
    </>
  )
}
