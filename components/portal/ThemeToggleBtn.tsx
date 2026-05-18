'use client'
import { useState, useRef, useCallback } from 'react'

const DURATION = 550
const EASING   = 'cubic-bezier(0.76, 0, 0.24, 1)'

export default function ThemeToggleBtn() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return document.documentElement.getAttribute('data-theme') !== 'light'
  })
  const [phase, setPhase] = useState<'idle' | 'falling' | 'rising'>('idle')
  const curtainColor = useRef('')

  const toggle = useCallback(() => {
    if (phase !== 'idle') return
    const next = isDark ? 'light' : 'dark'
    curtainColor.current = next === 'light' ? '#EDF1F7' : '#0F172A'
    setPhase('falling')

    setTimeout(() => {
      setIsDark(v => !v)
      if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
      try { localStorage.setItem('stagepay-theme', next) } catch {}
      setPhase('rising')
      setTimeout(() => setPhase('idle'), DURATION + 60)
    }, DURATION)
  }, [phase, isDark])

  const curtainStyle: React.CSSProperties = {
    position:        'fixed',
    inset:           0,
    background:      curtainColor.current,
    transformOrigin: 'top',
    transform:       phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
    transition:      phase !== 'idle' ? `transform ${DURATION}ms ${EASING}` : 'none',
    zIndex:          9997,
    pointerEvents:   'none',
  }

  const curtainLogoVisible = phase === 'falling'

  return (
    <>
      <style>{`
        .theme-toggle-btn{
          border:1px solid rgba(255,255,255,0.14);
          background:transparent;
          color:rgba(248,250,252,0.55);
        }
        .theme-toggle-btn:hover{
          border-color:#10B981 !important;
          color:#10B981 !important;
        }
        html[data-theme="light"] .theme-toggle-btn{
          border:1px solid rgba(15,23,42,0.18);
          color:rgba(15,23,42,0.55);
          background:transparent;
        }
      `}</style>
      <div aria-hidden="true" style={curtainStyle} />
      {phase !== 'idle' && (
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, opacity: curtainLogoVisible ? 1 : 0, transition: `opacity ${Math.round(DURATION * 0.25)}ms ease`,
        }}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
            <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
            <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
            <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
          </svg>
          <div style={{ fontFamily: 'var(--font-bebas, sans-serif)', fontSize: 22, letterSpacing: 4, color: '#10B981' }}>
            STAGEPAY
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="theme-toggle-btn"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', flexShrink: 0, transition: 'border-color .15s, color .15s' }}
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"  />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1"  y1="12" x2="3"  y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
    </>
  )
}
