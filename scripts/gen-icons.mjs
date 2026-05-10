// Run once: node scripts/gen-icons.mjs
// Generates public/icons/icon-192.png and icon-512.png from the favicon SVG.
// Requires: npm install -D sharp (dev-only, not added to main deps)

import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// SVG with solid background for maskable icon (safe zone = centre 80%)
const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0F1E"/>
  <!-- bars centred in safe zone (about 80% = 205px margin each side = 102..410) -->
  <rect x="102" y="290" width="70" height="180" rx="14" fill="#10B981"/>
  <rect x="196" y="220" width="70" height="250" rx="14" fill="#10B981" opacity=".82"/>
  <rect x="290" y="145" width="70" height="325" rx="14" fill="#10B981" opacity=".65"/>
  <rect x="384" y="62"  width="66" height="408" rx="14" fill="#10B981" opacity=".48"/>
</svg>`

mkdirSync(path.join(root, 'public', 'icons'), { recursive: true })

for (const size of [192, 512]) {
  await sharp(Buffer.from(svgSource))
    .resize(size, size)
    .png()
    .toFile(path.join(root, 'public', 'icons', `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}
console.log('Icons written to public/icons/')
