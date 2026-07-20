#!/usr/bin/env node
/**
 * Generate the Android adaptive icon from the original Spliit icon.
 *
 * Android launchers mask the adaptive icon: only the central "safe zone"
 * (66/108 of the canvas) is guaranteed visible. This script:
 *   1. samples the background color of the original icon (corner pixel),
 *   2. trims the icon to the logo's bounding box,
 *   3. centers the logo in the safe zone of a 1024x1024 canvas filled
 *      with the background color,
 * and writes assets/images/adaptive-icon.png. It prints the background
 * color to use for `android.adaptiveIcon.backgroundColor` in app.json.
 *
 * Usage: node scripts/make-adaptive-icon.js
 */
const sharp = require('sharp')
const path = require('path')

const SRC = path.join(__dirname, '../assets/images/icon.png')
const OUT = path.join(__dirname, '../assets/images/adaptive-icon.png')
const CANVAS = 1024
// Safe zone: 66dp of the 108dp canvas. Stay slightly inside it.
const SAFE = Math.round((CANVAS * 66) / 108) - 32

async function main() {
  const src = sharp(SRC)

  // 1. Background color from the top-left corner pixel.
  const { data } = await src
    .clone()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const [r, g, b] = data
  const bgHex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

  // 2. Trim to the logo bounding box (tolerant to slight gradients).
  const logo = await src.clone().trim({ threshold: 25 }).toBuffer()
  const logoMeta = await sharp(logo).metadata()

  // 3. Fit the logo inside the safe zone, centered on the background color.
  const scale = Math.min(SAFE / logoMeta.width, SAFE / logoMeta.height, 1)
  const w = Math.round(logoMeta.width * scale)
  const h = Math.round(logoMeta.height * scale)
  const resizedLogo = await sharp(logo).resize(w, h).toBuffer()

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(OUT)

  console.log(`Wrote ${OUT}`)
  console.log(`Logo: ${logoMeta.width}x${logoMeta.height} -> ${w}x${h} (safe zone ${SAFE}px)`)
  console.log(`Background color: ${bgHex}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
