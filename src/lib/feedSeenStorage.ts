import type { RaylsPublicFeedItem } from './raylsPublicFeed'

const STORAGE_KEY = 'rayls-dash-feed-seen-v1'
const MAX_KEYS = 96

export function feedItemKey(it: RaylsPublicFeedItem): string {
  return `${it.href}\u001f${it.title}`
}

export function loadSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const keys = parsed.filter((x): x is string => typeof x === 'string')
    return new Set(keys.slice(-MAX_KEYS))
  } catch {
    return new Set()
  }
}

export function saveSeenKeys(keys: Iterable<string>): void {
  const arr = [...new Set(keys)].slice(-MAX_KEYS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}

/** Premier chargement : enregistre la baseline sans afficher de pastilles « nouveau ». */
export function bootstrapSeenIfEmpty(items: RaylsPublicFeedItem[]): void {
  if (!items.length) return
  const prev = loadSeenKeys()
  if (prev.size > 0) return
  saveSeenKeys(items.map(feedItemKey))
}

export function markItemsAsSeen(items: RaylsPublicFeedItem[]): void {
  saveSeenKeys(items.map(feedItemKey))
}

export function freshItemKeys(items: RaylsPublicFeedItem[] | null): Set<string> {
  if (!items?.length) return new Set()
  const prev = loadSeenKeys()
  if (prev.size === 0) return new Set()
  return new Set(items.map(feedItemKey).filter((k) => !prev.has(k)))
}
