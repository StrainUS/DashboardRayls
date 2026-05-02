import { useEffect, useReducer, useState } from 'react'
import { NEWS_AND_DOCS_REFRESH_MS } from '../../constants/dashboard'
import {
  bootstrapSeenIfEmpty,
  feedItemKey,
  freshItemKeys,
  markItemsAsSeen,
} from '../../lib/feedSeenStorage'
import { fetchWithTimeout } from '../../lib/fetchUtil'
import {
  normalizeFeedItemHref,
  parseRaylsPublicFeed,
  resolveFeedFetchUrl,
  type RaylsPublicFeedItem,
} from '../../lib/raylsPublicFeed'
import { RAYLS_OFFICIAL } from '../../raylsConfig'

const CURATED: { title: string; description: string; href: string }[] = [
  {
    title: 'Blog',
    description: 'Articles et annonces publiés sur rayls.com',
    href: RAYLS_OFFICIAL.blog,
  },
  {
    title: 'Documentation',
    description: 'Guides produit et référence réseau public',
    href: RAYLS_OFFICIAL.docs,
  },
  {
    title: 'Litepaper',
    description: 'Synthèse du projet',
    href: RAYLS_OFFICIAL.litepaper,
  },
  {
    title: 'Linktree',
    description: 'Liens communiqués par l’équipe Rayls',
    href: RAYLS_OFFICIAL.linktree,
  },
]

/**
 * - Variable non définie : défaut `/rayls-feed.json` (fichier dans `public/`).
 * - `''`, `0`, `off`, `false` : désactive le flux automatique.
 */
function getFeedUrlConfig(): string {
  const raw = (import.meta.env as Record<string, string | undefined>).VITE_RAYLS_PUBLIC_FEED_URL
  if (raw !== undefined) {
    const t = String(raw).trim()
    const low = t.toLowerCase()
    if (t === '' || low === '0' || low === 'off' || low === 'false') return ''
    return t
  }
  return '/rayls-feed.json'
}

/** Flux JSON optionnel : monté seulement si la résolution d’URL réussit. */
function RaylsOptionalFeed({ fetchUrl }: { fetchUrl: string }) {
  const [items, setItems] = useState<RaylsPublicFeedItem[] | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [, bumpSeen] = useReducer((n: number) => n + 1, 0)

  const fresh = freshItemKeys(items)

  useEffect(() => {
    let cancelled = false

    const loadFeed = async () => {
      try {
        const res = await fetchWithTimeout(fetchUrl, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json: unknown = await res.json()
        const parsed = parseRaylsPublicFeed(json)
        if (!parsed) {
          throw new Error('Format JSON inattendu (attendu : tableau { title, href }).')
        }
        if (!cancelled) {
          bootstrapSeenIfEmpty(parsed)
          setItems(parsed)
          setFetchedAt(Date.now())
          setErr(null)
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Échec du chargement du flux.')
          setItems(null)
        }
      }
    }

    const startId = window.setTimeout(() => {
      void loadFeed()
    }, 0)

    const intervalId = window.setInterval(() => {
      void loadFeed()
    }, NEWS_AND_DOCS_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearTimeout(startId)
      window.clearInterval(intervalId)
    }
  }, [fetchUrl])

  const markRead = () => {
    if (!items?.length) return
    markItemsAsSeen(items)
    bumpSeen()
  }

  return (
    <>
      {items && items.length > 0 ? (
        <div className="dash-news-panel__feed-toolbar">
          {fresh.size > 0 ? (
            <span className="dash-news-panel__fresh-count" aria-live="polite">
              {fresh.size} nouvelle{fresh.size > 1 ? 's' : ''} entrée{fresh.size > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="dash-news-panel__fresh-count dash-news-panel__fresh-count--quiet">À jour</span>
          )}
          <button
            type="button"
            className="dash-news-panel__mark-read"
            onClick={markRead}
            disabled={fresh.size === 0}
          >
            Marquer comme lu
          </button>
        </div>
      ) : null}

      {err ? <div className="dash-news-panel__alert">{err}</div> : null}
      {items && items.length > 0 ? (
        <ul className="dash-news-panel__feed" aria-label="Entrées du flux">
          {items.slice(0, 8).map((it) => {
            const k = feedItemKey(it)
            const isFresh = fresh.has(k)
            return (
              <li key={k} className="dash-news-panel__feed-item">
                <a
                  className={`dash-news-panel__feed-link${isFresh ? ' dash-news-panel__feed-link--fresh' : ''}`}
                  href={normalizeFeedItemHref(it.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {isFresh ? (
                    <span className="dash-news-panel__new-pill" aria-label="Nouveau">
                      Nouveau
                    </span>
                  ) : null}
                  <span className="dash-news-panel__feed-title">{it.title}</span>
                  {it.publishedAt ? (
                    <span className="dash-news-panel__feed-date">{it.publishedAt}</span>
                  ) : null}
                </a>
              </li>
            )
          })}
        </ul>
      ) : !err ? (
        <p className="dash-news-panel__empty">Chargement du flux…</p>
      ) : null}
      {fetchedAt != null ? (
        <p className="dash-news-panel__meta">
          Dernière récupération :{' '}
          {new Date(fetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })}
        </p>
      ) : null}
    </>
  )
}

export function RaylsNewsPanel() {
  const config = getFeedUrlConfig()
  const fetchUrl = config ? resolveFeedFetchUrl(config) : null
  const feedActive = fetchUrl != null

  return (
    <div className="dash-news-panel">
      {feedActive ? <RaylsOptionalFeed fetchUrl={fetchUrl} /> : null}

      <ul className="dash-news-panel__curated" aria-label="Canaux de référence Rayls">
        {CURATED.map((c) => (
          <li key={c.href} className="dash-news-panel__curated-item">
            <a className="dash-news-panel__curated-link" href={c.href} target="_blank" rel="noopener noreferrer">
              <span className="dash-news-panel__curated-title">{c.title}</span>
              <span className="dash-news-panel__curated-desc">{c.description}</span>
            </a>
          </li>
        ))}
      </ul>

      {feedActive ? (
        <p className="dash-news-panel__hint dash-news-panel__hint--subtle">
          Entrées épinglées : modifiez <code className="dash-news-panel__code">public/rayls-feed.json</code> puis rebuild /
          redéployez — ou pointez <code className="dash-news-panel__code">VITE_RAYLS_PUBLIC_FEED_URL</code> vers votre propre
          JSON (CORS).
        </p>
      ) : (
        <p className="dash-news-panel__hint">
          Flux désactivé (<code className="dash-news-panel__code">VITE_RAYLS_PUBLIC_FEED_URL=off</code>). Sans variable, le
          défaut est <code className="dash-news-panel__code">/rayls-feed.json</code>.
        </p>
      )}
    </div>
  )
}
