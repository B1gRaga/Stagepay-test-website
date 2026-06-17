/**
 * Generates PWA icons from the Stagepay bars SVG.
 *
 * "any"      → transparent background, logo centred at 65% canvas size
 * "maskable" → dark background (#0F172A), logo centred at 65% (safe zone)
 *
 * Usage: node tools/generate-icons.js
 */
const path = require('path')
const sharp = require('sharp')

const iconsDir = path.join(__dirname, '../public/icons')
const GREEN    = '#10B981'
const DARK     = '#0F172A'

function barsSvg(size, withBackground) {
  // Bars source: 32×32 viewBox. Scale to 65% of canvas, centred.
  const logoSize = size * 0.65
  const scale    = logoSize / 32
  const offset   = (size - logoSize) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${withBackground ? `<rect width="${size}" height="${size}" fill="${DARK}"/>` : ''}
    <g transform="translate(${offset},${offset}) scale(${scale})">
      <rect x="0"  y="17" width="6"  height="15" rx="2" fill="${GREEN}"/>
      <rect x="9"  y="12" width="6"  height="20" rx="2" fill="${GREEN}" opacity=".82"/>
      <rect x="18" y="6"  width="6"  height="26" rx="2" fill="${GREEN}" opacity=".65"/>
      <rect x="27" y="0"  width="5"  height="32" rx="2" fill="${GREEN}" opacity=".48"/>
    </g>
  </svg>`
}

async function write(svgStr, outFile) {
  await sharp(Buffer.from(svgStr))
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, outFile))
  console.log(`✓ ${outFile}`)
}

async function main() {
  console.log('Generating icons…')
  // "any" — transparent background
  await write(barsSvg(512, false), 'icon-512.png')
  await write(barsSvg(192, false), 'icon-192.png')
  // "maskable" — solid dark background (Android adaptive icon safe zone)
  await write(barsSvg(512, true),  'maskable-512.png')
  await write(barsSvg(192, true),  'maskable-192.png')
  // apple-touch-icon — transparent (iOS adds its own rounded corners + bg)
  await write(barsSvg(180, false), 'apple-touch-icon.png')
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
