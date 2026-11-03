'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The installed app opens here (manifest start_url). The phone's own launch
// screen is a still logo on ink; this page is the same picture, served
// straight from the CDN, so it takes over almost at once and keeps the steps
// moving while the dashboard loads behind it. The router keeps this page on
// screen until the dashboard is ready to show.

const INK = '#1F2A44'
const PAPER = '#FAF7F0'
const AMBER = '#F2A900'

export default function Start() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="sp-start" role="status" aria-label="Opening StagePay">
      <style>{`
        .sp-start{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:${INK};}
        .sp-start svg{width:112px;height:112px;overflow:visible;}
        .sp-start rect{transform-box:fill-box;transform-origin:bottom;animation:spStep 1.1s ease-in-out infinite;}
        .sp-start rect:nth-child(2){animation-delay:.14s}
        .sp-start rect:nth-child(3){animation-delay:.28s}
        @keyframes spStep{0%,60%,100%{transform:scaleY(1)}30%{transform:scaleY(.35)}}
        @media (prefers-reduced-motion:reduce){
          .sp-start rect{animation:spFade 1.6s ease-in-out infinite;}
          @keyframes spFade{0%,100%{opacity:1}50%{opacity:.55}}
        }
      `}</style>
      <svg aria-hidden="true" viewBox="0 0 92.6 92.6">
        {/* each step runs 0.4 under the next one so no seam shows between them */}
        <rect x="24" y="69.73" width="23.27" height="22.87" fill={PAPER} />
        <rect x="46.87" y="46.87" width="23.26" height="45.73" fill={PAPER} />
        <rect x="69.73" y="24" width="22.87" height="68.6" fill={AMBER} />
      </svg>
      <noscript><meta httpEquiv="refresh" content="0;url=/dashboard" /></noscript>
    </div>
  )
}
