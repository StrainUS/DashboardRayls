/**
 * Valide public/rayls-feed.json (mêmes règles grossières que le parseur client).
 * Usage : node scripts/validate-rayls-feed.mjs [chemin]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const path = resolve(process.argv[2] ?? 'public/rayls-feed.json')

function isSafeHttp(s) {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function isSafePath(s) {
  if (!s.startsWith('/') || s.startsWith('//')) return false
  if (s.includes('..') || s.includes('#')) return false
  return /^\/[\w.\-~/%!?&=+]*$/.test(s)
}

let raw
try {
  raw = readFileSync(path, 'utf8')
} catch (e) {
  console.error(`Fichier introuvable : ${path}`)
  process.exit(1)
}

let json
try {
  json = JSON.parse(raw)
} catch (e) {
  console.error(`JSON invalide : ${path}`, e.message)
  process.exit(1)
}

if (!Array.isArray(json)) {
  console.error('Attendu : un tableau JSON.')
  process.exit(1)
}

let ok = 0
for (const row of json) {
  if (!row || typeof row !== 'object') {
    console.error('Entrée non objet :', row)
    process.exit(1)
  }
  const title = row.title
  const href = row.href ?? row.url
  if (typeof title !== 'string' || typeof href !== 'string') {
    console.error('title/href manquants ou invalides :', row)
    process.exit(1)
  }
  const h = href.trim()
  if (!title.trim() || !(isSafeHttp(h) || isSafePath(h))) {
    console.error('href non autorisé :', h)
    process.exit(1)
  }
  ok += 1
}

if (ok === 0) {
  console.error('Le tableau ne contient aucune entrée valide.')
  process.exit(1)
}

console.log(`OK — ${ok} entrée(s) dans ${path}`)
