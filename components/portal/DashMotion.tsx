'use client'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

const noop = () => () => {}
// true only while hydrating server HTML (the server snapshot is used then).
const useHydrating = () => useSyncExternalStore(noop, () => false, () => true)

// Small motion helpers for the dashboard. The server renders final values and
// finished layouts; these only replay them for people who allow motion.

const reduced = () => typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches

// Counts a money figure up to its value once. Server HTML (and screen readers,
// and a page whose script failed) always get the real value.
export function CountUp({ value, prefix, delay = 0, duration = 1000 }: { value: number; prefix: string; delay?: number; duration?: number }) {
  const [shown, setShown] = useState(value)
  const hydrating = useHydrating()
  // Before paint: in-app navigation starts from 0 with no flash. After a full page
  // load the server value is already on screen, so only count if that was just now.
  const late = useRef(false)
  useLayoutEffect(() => {
    late.current = hydrating && performance.now() > 1000
    if (!reduced() && value > 0 && !late.current) setShown(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (reduced() || value <= 0 || late.current) { setShown(value); return }
    let raf = 0
    let start = 0
    setShown(0)
    const tick = (t: number) => {
      if (!start) start = t + delay
      const p = Math.min(1, Math.max(0, (t - start) / duration))
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); setShown(value) }
  }, [value, delay, duration])
  const full = `${prefix}${Math.round(value).toLocaleString('en')}`
  return (
    <span>
      <span className="sr-only">{full}</span>
      {/* The final value, invisible, holds the width so the sentence doesn't re-wrap while counting. */}
      <span aria-hidden="true" style={{ display: 'inline-grid', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ gridArea: '1 / 1', visibility: 'hidden' }}><span className="cur">{prefix}</span>{Math.round(value).toLocaleString('en')}</span>
        <span style={{ gridArea: '1 / 1' }}><span className="cur">{prefix}</span>{Math.round(shown).toLocaleString('en')}</span>
      </span>
    </span>
  )
}

// Plays a section's CSS entrance when it scrolls into view. If the whole section
// is on screen when the page loads, its entrance simply plays on load.
// Off screen, it is held ("armed") until it arrives.
export function RevealOnView({ className = '', children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useState<'idle' | 'armed' | 'in'>('idle')
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !('IntersectionObserver' in window)) return
    // "Seen" = 85% of it on screen, or 60% of the screen for sections taller than that.
    const seen = (visible: number, height: number) => visible >= Math.min(height * 0.85, window.innerHeight * 0.6)
    const r = el.getBoundingClientRect()
    if (seen(Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)), r.height)) return
    setState('armed')
    const io = new IntersectionObserver(([e]) => {
      if (seen(e.intersectionRect.height, e.boundingClientRect.height)) { setState('in'); io.disconnect() }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={ref} className={`${className}${state === 'armed' ? ' armed' : state === 'in' ? ' in' : ''}`} {...rest}>
      {children}
    </section>
  )
}
