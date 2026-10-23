// Share the invoice PDF itself to WhatsApp through the phone's share menu.
// wa.me can only pre-fill text, so on phones the PDF goes through the Web
// Share API instead: the user picks WhatsApp, then the client. Computers keep
// the wa.me link (lib/wa-link.ts) — their share menus rarely reach WhatsApp.

import { useEffect, useState, useSyncExternalStore } from 'react'

let supportedCache: boolean | null = null

function canSharePdf() {
  if (supportedCache !== null) return supportedCache
  supportedCache = false
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare && window.matchMedia?.('(pointer: coarse)').matches) {
      supportedCache = navigator.canShare({ files: [new File([''], 'invoice.pdf', { type: 'application/pdf' })] })
    }
  } catch {}
  return supportedCache
}

const noSubscribe = () => () => {}

// Fetches the PDF ahead of the tap: the share has to start inside the click,
// before any await, or the browser refuses it. `file` stays null on computers,
// while loading (`preparing`), and if the fetch failed — callers then fall
// back to the wa.me link.
export function useSharablePdf(url: string | null, filename: string) {
  const supported = useSyncExternalStore(noSubscribe, canSharePdf, () => false)
  const [got, setGot] = useState<{ url: string; file: File | null } | null>(null)

  useEffect(() => {
    if (!supported || !url) return
    let live = true
    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then(res => (res.ok ? res.blob() : null))
      .then(blob => { if (live) setGot({ url, file: blob ? new File([blob], filename, { type: 'application/pdf' }) : null }) })
      .catch(() => { if (live) setGot({ url, file: null }) })
    return () => { live = false }
  }, [supported, url, filename])

  const ready = !!url && got?.url === url
  return { preparing: supported && !!url && !ready, file: ready ? got.file : null }
}

// Call synchronously inside the click handler: navigator.share runs before the
// first await. 'cancelled' means the user closed the share menu.
export async function sharePdf(file: File, text: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [file], text })
    return 'shared'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}
