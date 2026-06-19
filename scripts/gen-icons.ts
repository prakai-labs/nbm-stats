// Generate PWA icons (PNG) from the SVG source
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

const svgPath = join(process.cwd(), 'public/icons/icon-512.svg')
const svgBuffer = readFileSync(svgPath)

const targets = [
  { size: 192, name: 'icon-192.png', pad: 0 },
  { size: 512, name: 'icon-512.png', pad: 0 },
  // Maskable icons need more padding (safe zone ~80%)
  { size: 192, name: 'icon-maskable-192.png', pad: 30 },
  { size: 512, name: 'icon-maskable-512.png', pad: 80 },
  { size: 180, name: 'apple-touch-icon.png', pad: 0 },
  { size: 32, name: 'favicon-32.png', pad: 0 },
  { size: 16, name: 'favicon-16.png', pad: 0 },
]

async function main() {
  for (const t of targets) {
    const outPath = join(process.cwd(), 'public/icons', t.name)
    let pipeline = sharp(svgBuffer, { density: 384 })
      .resize(t.size, t.size, { fit: 'contain', background: { r: 16, g: 185, b: 129, alpha: 1 } })

    if (t.pad > 0) {
      // For maskable icons, render the SVG smaller and place on solid background
      const innerSize = Math.round(t.size * (1 - (t.pad * 2) / t.size))
      const innerSvg = sharp(svgBuffer, { density: 384 })
        .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
      const innerBuffer = await innerSvg.toBuffer()
      pipeline = sharp({
        create: {
          width: t.size,
          height: t.size,
          channels: 4,
          background: { r: 16, g: 185, b: 129, alpha: 1 },
        },
      }).composite([{ input: innerBuffer, gravity: 'center' }])
    }

    await pipeline.png({ quality: 90 }).toFile(outPath)
    console.log(`Generated ${t.name} (${t.size}x${t.size})`)
  }

  // Also create favicon.ico (just use 32x32 png as ico)
  const faviconPng = await sharp(svgBuffer, { density: 384 })
    .resize(32, 32, { fit: 'contain', background: { r: 16, g: 185, b: 129, alpha: 1 } })
    .png()
    .toBuffer()
  // Write as .ico with PNG content (browsers accept PNG with .ico extension)
  await sharp(faviconPng).toFile(join(process.cwd(), 'public', 'favicon.ico'))
  console.log('Generated favicon.ico')
}

main().catch(e => { console.error(e); process.exit(1) })
