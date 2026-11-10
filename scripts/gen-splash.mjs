// iPhone launch images (apple-touch-startup-image). iOS shows these while the
// installed app opens; each is the /start screen's first frame (ink, steps
// glyph 106pt wide, centred) so the hand-off to the animation is seamless.
// Run: node scripts/gen-splash.mjs   (sizes live in lib/splash-screens.json)
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const screens = JSON.parse(readFileSync(new URL('../lib/splash-screens.json', import.meta.url)))
const GLYPH = 106 // CSS px, matches components/StepLoader.tsx
const out = new URL('../public/splash/', import.meta.url)
mkdirSync(out, { recursive: true })

for (const { w, h, r } of screens) {
  const W = w * r, H = h * r, g = GLYPH * r, s = g / 68.6
  const x = (W - g) / 2, y = (H - g) / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#1F2A44"/>
    <g transform="translate(${x} ${y}) scale(${s}) translate(-24 -24)">
      <path d="M24 92.6 V69.73 H46.87 V46.87 H69.73 V92.6 Z" fill="#FAF7F0"/>
      <rect x="69.73" y="24" width="22.87" height="68.6" fill="#F2A900"/>
    </g></svg>`
  const file = `iphone-${w}x${h}@${r}x.png`
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(fileURLToPath(new URL(file, out)))
  console.log(file)
}
