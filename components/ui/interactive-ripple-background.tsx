'use client'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'

interface Ripple {
  x: number
  y: number
  id: number
}

export function RippleBackground({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const rippleIdRef = useRef(0)

  function spawnRipple(x: number, y: number) {
    const id = rippleIdRef.current++
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 2000)
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top)
  }

  // Ambient auto-ripples every 3 s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!containerRef.current) return
      const { width, height } = containerRef.current.getBoundingClientRect()
      spawnRipple(Math.random() * width, Math.random() * height)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={cn(
        'relative w-full min-h-screen overflow-hidden cursor-pointer',
        'bg-gradient-to-br from-[#f3ede1] via-[#ede5d4] to-[#e2d8c6]',
        className,
      )}
    >
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(26,20,10,.065) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Green ripples */}
      {ripples.map(r => (
        <div
          key={r.id}
          className="absolute pointer-events-none"
          style={{ left: r.x, top: r.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ripple" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/20 animate-ripple" style={{ animationDelay: '0.3s' }} />
          <div className="absolute inset-0 rounded-full border border-emerald-300/10 animate-ripple" style={{ animationDelay: '0.6s' }} />
        </div>
      ))}

      <div className="relative z-10">{children}</div>
    </div>
  )
}
