import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const out   = join(__dir, '..', 'public', 'icons')
mkdirSync(out, { recursive: true })

// Icon SVG — 3 ascending bars on dark navy, full-bleed (no rounded corners in SVG
// so the OS mask looks intentional). Maskable safe zone is center 80%: 51px inset
// on each side of a 512px canvas — bars sit comfortably within that zone.
// 4-bar logo — matches the brand mark used throughout the app.
// Bars go left-to-right shortest→tallest with opacity steps identical
// to the sidebar SVG, on a full-bleed dark navy background.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <radialGradient id="glow" cx="68%" cy="50%" r="52%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#10B981" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="#0B1120"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <rect x="68"  y="308" width="78" height="128" rx="12" fill="url(#bar)" opacity=".5"/>
  <rect x="182" y="224" width="78" height="212" rx="12" fill="url(#bar)" opacity=".68"/>
  <rect x="296" y="140" width="78" height="296" rx="12" fill="url(#bar)" opacity=".84"/>
  <rect x="410" y="56"  width="64" height="380" rx="12" fill="url(#bar)"/>
  <rect x="52"  y="444" width="408" height="4"  rx="2" fill="rgba(16,185,129,0.3)"/>
</svg>`

const svgBuf = Buffer.from(iconSvg)

async function make(size, name) {
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(join(out, name))
  console.log(`✓ ${name} (${size}×${size})`)
}

await make(192, 'icon-192.png')
await make(512, 'icon-512.png')

// Apple touch icon — 180px, same design
await make(180, 'apple-touch-icon.png')

console.log('Icons generated.')
