#!/usr/bin/env node
/**
 * Génère public/og-image.png (1200×630) pour Open Graph / aperçus de liens.
 * Le logo est centré sur fond #0a0b0e (theme-color). Pour un rendu encore plus net,
 * remplace public/rayls-logo-official.png par une source ≥800px de haut.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const logo = path.join(pub, 'rayls-logo-official.png')
const out = path.join(pub, 'og-image.png')

const W = 1200
const H = 630
const bg = { r: 10, g: 11, b: 14, alpha: 1 }

if (!existsSync(logo)) {
  console.error(`Fichier manquant : ${logo}`)
  process.exit(1)
}

const logoTargetH = 440
const resizedBuf = await sharp(logo)
  .resize({
    height: logoTargetH,
    fit: 'inside',
    withoutEnlargement: false,
    kernel: sharp.kernel.lanczos3,
  })
  .sharpen({ sigma: 0.35, m1: 0.8, m2: 0.15 })
  .png()
  .toBuffer()

const meta = await sharp(resizedBuf).metadata()
const lw = meta.width ?? 0
const lh = meta.height ?? 0
const left = Math.max(0, Math.round((W - lw) / 2))
const top = Math.max(0, Math.round((H - lh) / 2))

await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: bg,
  },
})
  .composite([{ input: resizedBuf, left, top }])
  .png({ compressionLevel: 8, effort: 10 })
  .toFile(out)

console.log(`OK — ${out} (${W}×${H})`)
