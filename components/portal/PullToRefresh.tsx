'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 68
const MAX      = 110
const RESIST   = 3.2

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router         = useRouter()
  const mainRef        = useRef<HTMLElement>(null)
  const startY         = useRef(0)
  const active         = useRef(false)
  const pullPx         = useRef(0)
  const refreshingRef  = useRef(false)
  const [ratio, setRatio]         = useState(0)   // 0–1+ pull progress
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 2) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    const onMove = (e: TouchEvent) => {
      if (!active.current || refreshingRef.current) return
      if (el.scrollTop > 2) { active.current = false; setRatio(0); return }
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { pullPx.current = 0; setRatio(0); return }
      e.preventDefault()
      pullPx.current = Math.min(dy / RESIST, MAX)
      setRatio(pullPx.current / THRESHOLD)
    }

    const onEnd = () => {
      if (!active.current) return
      active.current = false
      if (pullPx.current >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        setRatio(0)
        pullPx.current = 0
        try { (navigator as any).vibrate?.(18) } catch {}
        router.refresh()
        setTimeout(() => {
          refreshingRef.current = false
          setRefreshing(false)
        }, 1100)
      } else {
        setRatio(0)
        pullPx.current = 0
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [router])

  const clamped = Math.min(ratio, 1)
  const show    = clamped > 0.08 || refreshing
  const ready   = clamped >= 1

  return (
    <>
      <style>{`@keyframes ptr-spin{to{transform:rotate(360deg);}}`}</style>

      {show && (
        <div
          aria-hidden="true"
          style={{
            position:   'fixed',
            top:        'calc(44px + env(safe-area-inset-top,0px) + 10px)',
            left:       '50%',
            transform:  `translateX(-50%) scale(${0.45 + clamped * 0.55})`,
            opacity:    Math.min(clamped * 1.6, 1),
            width:  36, height: 36,
            borderRadius: '50%',
            background: 'var(--surface,#263244)',
            border:     '1px solid rgba(255,255,255,0.1)',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            zIndex:     198,
            boxShadow:  '0 4px 16px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            transition: refreshing ? 'opacity .25s ease' : 'none',
          }}
        >
          {refreshing ? (
            <svg
              width="15" height="15" viewBox="0 0 16 16"
              fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round"
              style={{ animation: 'ptr-spin .7s linear infinite' }}
            >
              <path d="M14 8A6 6 0 112 8"/><path d="M14 4v4h-4"/>
            </svg>
          ) : (
            <svg
              width="13" height="13" viewBox="0 0 16 16"
              fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round"
              style={{ transform: `rotate(${ready ? 180 : 0}deg)`, transition: 'transform .18s ease' }}
            >
              <path d="M8 3v10M4 9l4 4 4-4"/>
            </svg>
          )}
        </div>
      )}

      <main ref={mainRef} className="portal-main" style={{ position: 'relative' }}>
        {children}
      </main>
    </>
  )
}
