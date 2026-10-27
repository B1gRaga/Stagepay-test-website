'use client'

import { useEffect } from 'react'

// A quiet dot matrix behind every `.band` section. Dots drift on their own when
// idle and brighten to amber near the cursor/finger. Ported from the original
// static-HTML design, scoped to whichever page mounts it (so it doesn't reach
// into the portal). One canvas per section, one shared rAF loop, culled by
// IntersectionObserver, and fully static (no pointer reactivity) under
// prefers-reduced-motion and on touch screens: redrawing every dot each frame
// costs a phone seconds of main-thread time, and there's no cursor to follow.
// `selector` picks the sections that get a canvas.
export function DotGridBackground({ selector = '.lp .band' }: { selector?: string }) {
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia?.('(pointer: fine)').matches
    const AMBER = [242, 169, 0]
    const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

    type Dot = { x: number; y: number; v: number }
    type Layer = {
      sec: HTMLElement
      ctx: CanvasRenderingContext2D
      canvas: HTMLCanvasElement
      base: number[]
      baseA: number
      amberA: number
      dots: Dot[]
      W: number
      H: number
      mx: number
      my: number
      tx: number
      ty: number
      live: boolean
      visible: boolean
      t: number
      last: number
    }

    const layers: Layer[] = []
    const cleanupFns: Array<() => void> = []

    function draw(L: Layer, dt: number) {
      const { ctx, W, H } = L
      if (!W || !H) return
      if (!L.live || performance.now() - (L.last || 0) > 2500) {
        L.tx = W * (0.5 + 0.38 * Math.sin(L.t * 0.23))
        L.ty = H * (0.5 + 0.32 * Math.sin(L.t * 0.31 + 1))
      }
      if (L.mx < -1000) { L.mx = L.tx; L.my = L.ty }
      const f = dt ? Math.min(1, dt * 6) : 1
      L.mx += (L.tx - L.mx) * f
      L.my += (L.ty - L.my) * f
      ctx.clearRect(0, 0, W, H)
      const R = W < 600 ? 120 : 170
      const t = L.t
      for (const p of L.dots) {
        const dx = p.x - L.mx, dy = p.y - L.my
        const target = reduce ? 0 : Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / R)
        p.v += (target - p.v) * (dt ? Math.min(1, dt * 10) : 1)
        const idle = 0.5 + 0.5 * Math.sin(t * 0.8 + p.x * 0.02 + p.y * 0.015)
        ctx.fillStyle = p.v > 0.15 ? rgba(AMBER, (0.2 + p.v * 0.6) * L.amberA) : rgba(L.base, L.baseA + idle * 0.06)
        ctx.beginPath()
        ctx.arc(p.x, p.y - p.v * 2, 1 + p.v * 1.6 + idle * 0.25, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const sections = Array.from(document.querySelectorAll<HTMLElement>(selector))

    sections.forEach(sec => {
      const canvas = document.createElement('canvas')
      canvas.className = 'dotfx'
      canvas.setAttribute('aria-hidden', 'true')
      sec.insertBefore(canvas, sec.firstChild)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const ink = sec.classList.contains('ink')
      const L: Layer = {
        sec, ctx, canvas,
        base: ink ? [139, 149, 171] : [167, 158, 140],
        baseA: ink ? 0.16 : 0.14,
        amberA: ink ? 0.5 : 0.45,
        dots: [], W: 0, H: 0, mx: -9999, my: -9999, tx: 0, ty: 0,
        live: false, visible: true, t: Math.random() * 10, last: 0,
      }
      layers.push(L)

      function size() {
        const w = sec.clientWidth, h = sec.clientHeight
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        if (w === L.W && h === L.H) return
        L.W = w; L.H = h
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        const s = w < 600 ? 22 : 28
        L.dots = []
        for (let y = s / 2; y < h; y += s) for (let x = s / 2; x < w; x += s) L.dots.push({ x, y, v: 0 })
        draw(L, 0)
      }

      let ro: ResizeObserver | null = null
      if (window.ResizeObserver) { ro = new ResizeObserver(size); ro.observe(sec) }
      else window.addEventListener('resize', size)

      function point(e: PointerEvent) {
        const r = sec.getBoundingClientRect()
        L.tx = e.clientX - r.left
        L.ty = e.clientY - r.top
        L.live = true
        L.last = performance.now()
      }
      function onLeave() { L.live = false }
      sec.addEventListener('pointermove', point, { passive: true })
      sec.addEventListener('pointerdown', point, { passive: true })
      sec.addEventListener('pointerleave', onLeave)
      size()

      cleanupFns.push(() => {
        ro?.disconnect()
        if (!window.ResizeObserver) window.removeEventListener('resize', size)
        sec.removeEventListener('pointermove', point)
        sec.removeEventListener('pointerdown', point)
        sec.removeEventListener('pointerleave', onLeave)
        canvas.remove()
      })
    })

    if (reduce) return () => cleanupFns.forEach(fn => fn())

    let io: IntersectionObserver | null = null
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          const L = layers.find(l => l.sec === e.target)
          if (L) L.visible = e.isIntersecting
        })
      })
      layers.forEach(L => io!.observe(L.sec))
    }

    let last = performance.now()
    let raf = 0
    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!document.hidden) {
        layers.forEach(L => { if (L.visible) { L.t += dt; draw(L, dt) } })
      }
      raf = requestAnimationFrame(loop)
    }
    // Start once the page has settled so the drift doesn't compete with load.
    const start = () => { last = performance.now(); raf = requestAnimationFrame(loop) }
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2000 })
      : window.setTimeout(start, 1000)

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      cancelAnimationFrame(raf)
      io?.disconnect()
      cleanupFns.forEach(fn => fn())
    }
  }, [selector])

  return null
}
