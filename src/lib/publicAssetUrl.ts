/**
 * Chemin URL pour un fichier servi depuis `public/` après build Vite.
 * Préfixe `import.meta.env.BASE_URL` (ex. `/DashboardRayls/`) pour GitHub Pages et sous-chemins.
 */
export function publicAssetUrl(pathFromPublic: string): string {
  const raw = pathFromPublic.trim().replace(/^\/+/, '')
  const base = import.meta.env.BASE_URL ?? '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}${raw}`
}

/** URL absolue same-origin pour `fetch` (flux JSON dans `public/`, etc.). */
export function sameOriginPublicAbsoluteUrl(pathFromPublic: string): string {
  return `${window.location.origin}${publicAssetUrl(pathFromPublic)}`
}
