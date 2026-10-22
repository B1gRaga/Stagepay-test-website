'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Shown only when the app itself fails to render. It reports the error to
// Sentry and offers a way back, in place of Next.js's bare default screen.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#FAF7F0', color: '#1F2A44', fontFamily: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", padding: 24 }}>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: '#3D4659', margin: '12px 0 24px' }}>
            StagePay hit an unexpected problem and we’ve been told about it. Try again, or come back in a minute.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => reset()} style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 8, background: '#F2A900', color: '#1F2A44', font: '700 15px inherit', cursor: 'pointer' }}>Try again</button>
            <a href="/dashboard" style={{ height: 44, padding: '0 20px', borderRadius: 8, boxShadow: 'inset 0 0 0 1.5px #1F2A44', color: '#1F2A44', fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Go to dashboard</a>
          </div>
          {error.digest && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 20 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
