'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BootScreen, BOOT_FLAG } from '@/components/StepLoader'

// The installed app opens here (manifest start_url). The phone's own launch
// screen is a still logo on ink; this page draws the same logo at the same
// size and centre, then animates it. The dashboard's loading screen picks up
// the same picture (via BOOT_FLAG) so nothing jumps until the dashboard shows.

export default function Start() {
  const router = useRouter()

  useEffect(() => {
    try { sessionStorage.setItem(BOOT_FLAG, String(Date.now())) } catch {}
    router.replace('/dashboard')
  }, [router])

  return (
    <>
      <BootScreen />
      <noscript><meta httpEquiv="refresh" content="0;url=/dashboard" /></noscript>
    </>
  )
}
