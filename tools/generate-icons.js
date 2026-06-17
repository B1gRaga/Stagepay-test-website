/**
 * Generates maskable PWA icons with proper safe zone padding.
 * Maskable icons need the logo in the inner 80% safe zone so Android
 * circle/squircle clipping doesn't cut off the bars chart.
 *
 * Usage: node tools/generate-icons.js
 */
const path = require('path')
const sharp = require('sharp')

const iconsDir = path.join(__dirname, '../public/icons')

async function generateMaskable(srcFile, outFile, size) {
  // Logo sits in the inner 68% of the canvas — comfortably within the 80% safe zone.
  // We resize without 'contain' to avoid a background-colour seam, then composite.
  const logoSize = Math.round(size * 0.68)

  const resized = await sharp(path.join(iconsDir, srcFile))
    .resize(logoSize, logoSize) // simple scale — preserves original background gradient
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0F172A
    },
  })
    .composite([{ input: resized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, outFile))

  console.log(`✓ ${outFile} (${size}×${size})`)
}

async function main() {
  console.log('Generating maskable icons…')
  await generateMaskable('icon-512.png', 'maskable-512.png', 512)
  await generateMaskable('icon-192.png', 'maskable-192.png', 192)
  await generateMaskable('icon-192.png', 'apple-touch-icon.png', 180) // overwrites with padded version
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
