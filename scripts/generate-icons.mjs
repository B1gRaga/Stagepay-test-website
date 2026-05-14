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
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0C1424"/>
  <rect x="120" y="270" width="72" height="150" rx="10" fill="#065f46"/>
  <rect x="220" y="190" width="72" height="230" rx="10" fill="#059669"/>
  <rect x="320" y="105" width="72" height="315" rx="10" fill="#10B981"/>
  <rect x="100" y="422" width="312" height="2"   rx="1" fill="rgba(16,185,129,0.25)"/>
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
