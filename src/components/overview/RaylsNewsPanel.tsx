import { useEffect, useReducer, useState } from 'react'
import { NEWS_AND_DOCS_REFRESH_MS } from '../../constants/dashboard'
import { useI18n } from '../../i18n'
import { localeTag } from '../../i18n/translate'
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

/**
 * - Variable non définie : défaut `/rayls-feed.json` (fichier dans `public/`).
 * - `''`, `0`, `off`, `false` : désactive le flux automatique.
 */
function getFeedUrlConfig(): string {
  const raw = (import.meta.env as Record<string, string | undefined>).VITE_RAYLS_PUBLIC_FEED_URL
  if (raw !== undefined) {
    const s = String(raw).trim()
    const low = s.toLowerCase()
    if (s === '' || low === '0' || low === 'off' || low === 'false') return ''
    return s
  }
  return '/rayls-feed.json'
}

/** Flux JSON optionnel : monté seulement si la résolution d’URL réussit. */
function RaylsOptionalFeed({ fetchUrl }: { fetchUrl: string }) {
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
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
          throw new Error('FORMAT')
        }
        if (!cancelled) {
          bootstrapSeenIfEmpty(parsed)
          setItems(parsed)
          setFetchedAt(Date.now())
          setErr(null)
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg === 'FORMAT') setErr(t('news.errFormat'))
          else setErr(msg || t('news.errLoad'))
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
  }, [fetchUrl, t])

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
              {t('news.fresh', { n: fresh.size })}
            </span>
          ) : (
            <span className="dash-news-panel__fresh-count dash-news-panel__fresh-count--quiet">
              {t('news.upToDate')}
            </span>
          )}
          <button
            type="button"
            className="dash-news-panel__mark-read"
            onClick={markRead}
            disabled={fresh.size === 0}
          >
            {t('news.markRead')}
          </button>
        </div>
      ) : null}

      {err ? <div className="dash-news-panel__alert">{err}</div> : null}
      {items && items.length > 0 ? (
        <ul className="dash-news-panel__feed" aria-label={t('news.feedAria')}>
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
                    <span className="dash-news-panel__new-pill" aria-label={t('news.new')}>
                      {t('news.new')}
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
        <p className="dash-news-panel__empty">{t('news.loading')}</p>
      ) : null}
      {fetchedAt != null ? (
        <p className="dash-news-panel__meta">
          {t('news.lastFetch')}{' '}
          {new Date(fetchedAt).toLocaleString(loc, { dateStyle: 'short', timeStyle: 'medium' })}
        </p>
      ) : null}
    </>
  )
}

const CURATED: { titleKey: string; descKey: string; href: string }[] = [
  { titleKey: 'news.curatedBlog', descKey: 'news.curatedBlogD', href: RAYLS_OFFICIAL.blog },
  { titleKey: 'news.curatedDocs', descKey: 'news.curatedDocsD', href: RAYLS_OFFICIAL.docs },
  { titleKey: 'news.curatedLite', descKey: 'news.curatedLiteD', href: RAYLS_OFFICIAL.litepaper },
  { titleKey: 'news.curatedLink', descKey: 'news.curatedLinkD', href: RAYLS_OFFICIAL.linktree },
]

export function RaylsNewsPanel() {
  const { t } = useI18n()
  const config = getFeedUrlConfig()
  const fetchUrl = config ? resolveFeedFetchUrl(config) : null
  const feedActive = fetchUrl != null

  return (
    <div className="dash-news-panel">
      {feedActive ? <RaylsOptionalFeed fetchUrl={fetchUrl} /> : null}

      <ul className="dash-news-panel__curated" aria-label={t('news.curatedAria')}>
        {CURATED.map((c) => (
          <li key={c.href} className="dash-news-panel__curated-item">
            <a className="dash-news-panel__curated-link" href={c.href} target="_blank" rel="noopener noreferrer">
              <span className="dash-news-panel__curated-title">{t(c.titleKey)}</span>
              <span className="dash-news-panel__curated-desc">{t(c.descKey)}</span>
            </a>
          </li>
        ))}
      </ul>

      {feedActive ? (
        <p className="dash-news-panel__hint dash-news-panel__hint--subtle">
          {t('news.hintActive')}
        </p>
      ) : (
        <p className="dash-news-panel__hint">{t('news.hintOff')}</p>
      )}
    </div>
  )
}
