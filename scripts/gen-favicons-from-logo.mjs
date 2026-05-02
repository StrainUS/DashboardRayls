#!/usr/bin/env node
/**
 * Regénère favicon-16/32, apple-touch-icon et favicon.ico depuis public/rayls-logo-official.png.
 * Usage : copier ton logo sur le Bureau vers le projet, puis :
 *   cp ~/Desktop/ton-logo.png public/rayls-logo-official.png
 *   npm run favicons:from-logo
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')
const logo = path.join(pub, 'rayls-logo-official.png')
const bg = '#0a0b0e'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

if (!existsSync(logo)) {
  console.error(`Fichier manquant : ${logo}`)
  console.error('Copie d’abord ton logo depuis le Bureau, ex. :')
  console.error('  cp ~/Desktop/TON_FICHIER.png public/rayls-logo-official.png')
  process.exit(1)
}

function sharpSquare(size, outName) {
  const out = path.join(pub, outName)
  execFileSync(
    npx,
    [
      '--yes',
      'sharp-cli',
      'resize',
      String(size),
      String(size),
      '--fit',
      'contain',
      '--background',
      bg,
      '-i',
      logo,
      '-f',
      'png',
      '-o',
      out,
    ],
    { stdio: 'inherit', cwd: root },
  )
}

sharpSquare(16, 'favicon-16.png')
sharpSquare(32, 'favicon-32.png')
sharpSquare(180, 'apple-touch-icon.png')

const dir = mkdtempSync(path.join(tmpdir(), 'rayls-ico-'))
try {
  execFileSync('npm', ['init', '-y'], { cwd: dir, stdio: 'ignore' })
  execFileSync('npm', ['install', 'png-to-ico@2.1.8'], { cwd: dir, stdio: 'inherit' })
  const runner = path.join(dir, 'make-ico.mjs')
  writeFileSync(
    runner,
    `import pti from 'png-to-ico';
import fs from 'node:fs';
const buf = await pti(${JSON.stringify([path.join(pub, 'favicon-16.png'), path.join(pub, 'favicon-32.png')])});
fs.writeFileSync(${JSON.stringify(path.join(pub, 'favicon.ico'))}, buf);
`,
  )
  execFileSync('node', [runner], { cwd: dir, stdio: 'inherit' })
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log('OK — favicons générés depuis rayls-logo-official.png')
