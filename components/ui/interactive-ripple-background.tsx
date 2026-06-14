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
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 2100)
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top)
  }

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
      className="relative w-full min-h-screen overflow-hidden cursor-pointer bg-gradient-to-br from-[#f3ede1] via-[#ede5d4] to-[#e2d8c6]"
    >
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(26,20,10,.065) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Green ripple rings — each ring is independent, centered at click point */}
      {ripples.map(r => (
        <div key={r.id} className="absolute pointer-events-none z-0" style={{ left: r.x, top: r.y }}>
          <div style={{ position: 'absolute', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '2px solid rgba(16,185,129,.35)', animation: 'rippleExpand 2s ease-out forwards' }} />
          <div style={{ position: 'absolute', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '2px solid rgba(16,185,129,.22)', animation: 'rippleExpand 2s ease-out .35s forwards' }} />
          <div style={{ position: 'absolute', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '1px solid rgba(16,185,129,.12)', animation: 'rippleExpand 2s ease-out .7s forwards' }} />
        </div>
      ))}

      {/* Content — centred via flex */}
      <div className={cn('relative z-10 w-full min-h-screen flex items-center justify-center', className)}>
        {children}
      </div>

      <style>{`
        @keyframes rippleExpand {
          0%   { width: 0;     height: 0;     opacity: 1; }
          100% { width: 520px; height: 520px; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
