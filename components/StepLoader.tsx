'use client'

import { useEffect, useState } from 'react'

// The StagePay steps as a loader. The phone's launch screen shows the
// maskable icon (glyph = 225/512 of it) at 240dp, so the glyph is ~106px
// there; the full-screen loader draws it at exactly that size and centre so
// the hand-off from the still launch logo is seamless.
//
// Cold start: /start (full-screen) -> dashboard loading.tsx (full-screen
// again, via the boot flag) -> dashboard. The animation's phase is tied to
// the page clock so it carries on across that swap instead of restarting.

const INK = '#1F2A44'
const PAPER = '#FAF7F0'
const AMBER = '#F2A900'
const PERIOD = 1100
export const BOOT_FLAG = 'sp-boot'

const CSS = `
  .sp-steps{display:block;overflow:visible;}
  .sp-steps rect{transform-box:fill-box;transform-origin:bottom;animation:spStep ${PERIOD}ms ease-in-out infinite;animation-delay:var(--d,0ms);}
  .sp-steps rect:nth-child(2){animation-delay:calc(var(--d,0ms) + 140ms)}
  .sp-steps rect:nth-child(3){animation-delay:calc(var(--d,0ms) + 280ms)}
  @keyframes spStep{0%,60%,100%{transform:scaleY(1)}30%{transform:scaleY(.35)}}
  .sp-boot{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;background:${INK};}
  .sp-inline{display:flex;align-items:center;justify-content:center;height:100%;min-height:40vh;}
  @media (prefers-reduced-motion:reduce){
    .sp-steps rect,.sp-steps rect:nth-child(2),.sp-steps rect:nth-child(3){animation:spFade 1.6s ease-in-out infinite;}
    @keyframes spFade{0%,100%{opacity:1}50%{opacity:.55}}
  }
`

function Steps({ size, low, delay }: { size: number; low: string; delay?: number }) {
  return (
    <svg
      className="sp-steps"
      aria-hidden="true"
      viewBox="24 24 68.6 68.6"
      width={size}
      height={size}
      style={delay != null ? ({ '--d': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {/* each step runs 0.4 under the next one so no seam shows between them */}
      <rect x="24" y="69.73" width="23.27" height="22.87" fill={low} />
      <rect x="46.87" y="46.87" width="23.26" height="45.73" fill={low} />
      <rect x="69.73" y="24" width="22.87" height="68.6" fill={AMBER} />
    </svg>
  )
}

/** Full-screen ink launch screen, identical to the phone's own. */
export function BootScreen({ label = 'Opening StagePay' }: { label?: string }) {
  // Negative delay = continue the cycle from wherever the page clock is.
  const [delay] = useState(() => (typeof performance === 'undefined' ? 0 : -(performance.now() % PERIOD)))
  return (
    <div className="sp-boot" role="status" aria-label={label}>
      <style>{CSS}</style>
      <Steps size={106} low={PAPER} delay={delay} />
    </div>
  )
}

/**
 * Loader for portal routes. Straight after /start it keeps the full-screen
 * launch look so the logo never jumps; on ordinary in-app navigation it is
 * a small version of the same steps.
 */
export default function StepLoader({ label = 'Loading' }: { label?: string }) {
  const [boot] = useState(() => {
    try { return typeof window !== 'undefined' && Date.now() - Number(sessionStorage.getItem(BOOT_FLAG) || 0) < 10000 } catch { return false }
  })
  // The flag is single-use: once this loader gives way to the page, it's gone.
  useEffect(() => () => { try { sessionStorage.removeItem(BOOT_FLAG) } catch {} }, [])

  if (boot) return <BootScreen label={label} />
  return (
    <div className="sp-inline" role="status" aria-label={label}>
      <style>{CSS}</style>
      <Steps size={40} low="var(--t1)" />
    </div>
  )
}
