'use client'
import { useState } from 'react'

export default function ThemeToggleBtn() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return document.documentElement.getAttribute('data-theme') !== 'light'
  })

  function toggle() {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try { localStorage.setItem('stagepay-theme', next) } catch {}
  }

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
      <button
        onClick={toggle}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="theme-toggle-btn"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', flexShrink: 0, transition: 'border-color .15s, color .15s' }}
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21h6"/>
            <path d="M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V18H9v-3.8C7.2 13.16 6 11.22 6 9a6 6 0 016-6z"/>
            <path d="M9.5 18.5h5"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21h6"/>
            <path d="M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V18H9v-3.8C7.2 13.16 6 11.22 6 9a6 6 0 016-6z" strokeDasharray="2 2"/>
            <path d="M9.5 18.5h5"/>
          </svg>
        )}
      </button>
    </>
  )
}
