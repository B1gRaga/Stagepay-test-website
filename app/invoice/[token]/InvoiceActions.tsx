'use client'
import { useState } from 'react'

// Copy an account number, phone number or reference with one tap; parents
// paste these straight into their banking or mobile-money app.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const t = document.createElement('textarea')
      t.value = value; document.body.appendChild(t); t.select()
      try { document.execCommand('copy') } finally { t.remove() }
    }
    setDone(true)
    setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" className="pi-copy" onClick={copy} aria-label={`Copy ${label}`}>
      <span aria-live="polite">{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export function PrintButton() {
  return <button type="button" className="pi-btn pi-btn-2" onClick={() => window.print()}>Print</button>
}
