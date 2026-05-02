import { isSafeHttpOrHttpsUrl, isSafeRootRelativePublicPath } from './safeUrl'
import { sameOriginPublicAbsoluteUrl } from './publicAssetUrl'

export type RaylsPublicFeedItem = {
  title: string
  href: string
  publishedAt?: string
}

function isAllowedFeedItemHref(href: string): boolean {
  return isSafeHttpOrHttpsUrl(href) || isSafeRootRelativePublicPath(href)
}

/** URL absolue pour `fetch` (https, ou même origine pour un chemin `/…`). */
export function resolveFeedFetchUrl(config: string): string | null {
  const t = config.trim()
  if (!t) return null
  if (isSafeHttpOrHttpsUrl(t)) return t
  if (isSafeRootRelativePublicPath(t)) {
    /** Même logique que les assets `public/` : préfixe `import.meta.env.BASE_URL` (ex. GitHub Pages). */
    return sameOriginPublicAbsoluteUrl(t)
  }
  return null
}

/** URL absolue pour un lien d’entrée de flux (http(s) ou chemin racine). */
export function normalizeFeedItemHref(href: string): string {
  const h = href.trim()
  if (isSafeHttpOrHttpsUrl(h)) return h
  if (isSafeRootRelativePublicPath(h)) {
    return sameOriginPublicAbsoluteUrl(h)
  }
  return h
}

/** Valide un JSON tableau d’entrées actualités (sans dépendance externe). */
export function parseRaylsPublicFeed(json: unknown): RaylsPublicFeedItem[] | null {
  if (!Array.isArray(json)) return null
  const out: RaylsPublicFeedItem[] = []
  for (const row of json) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const title = o.title
    const href = o.href ?? o.url
    if (typeof title !== 'string' || typeof href !== 'string') continue
    const t = title.trim()
    const h = href.trim()
    if (!t || !isAllowedFeedItemHref(h)) continue
    const publishedAt =
      typeof o.publishedAt === 'string'
        ? o.publishedAt
        : typeof o.date === 'string'
          ? o.date
          : undefined
    out.push({ title: t, href: h, publishedAt })
  }
  return out.length > 0 ? out : null
}
