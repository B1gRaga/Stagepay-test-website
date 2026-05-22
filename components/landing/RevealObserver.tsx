'use client'

import { useEffect } from 'react'

export function RevealObserver() {
  useEffect(() => {
    const reveals = document.querySelectorAll<HTMLElement>('.reveal')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    reveals.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
  return null
}
