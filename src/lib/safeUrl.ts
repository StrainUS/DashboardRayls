/**
 * Vérifie qu’une chaîne est une URL http(s) absolue sûre pour `href` (exclut javascript:, data:, etc.).
 */
export function isSafeHttpOrHttpsUrl(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Chemin public same-origin (fichier dans `public/` en build Vite), ex. `/rayls-feed.json`.
 * Exclut les chemins `//…`, `..` et les caractères non sûrs pour limiter les abus.
 */
export function isSafeRootRelativePublicPath(raw: string): boolean {
  const s = raw.trim()
  if (!s.startsWith('/') || s.startsWith('//')) return false
  if (s.includes('..') || s.includes('#')) return false
  return /^\/[\w.\-~/%!?&=+]*$/.test(s)
}
