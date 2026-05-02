import type { Locale } from '../i18n/types'
import { localeTag } from '../i18n/translate'
import { coingeckoUsesPublicQuota } from '../raylsMarket'

/**
 * Cadences CoinGecko — sans clé / proxy, l’API publique : 429 si on poll trop souvent (défaut 10 s).
 * Avec clé ou `VITE_COINGECKO_API_ROOT` : défaut 5 s pour EUR / agrégats ; le USD peut déjà suivre MEXC en WS.
 */
const envSpot = Number(import.meta.env.VITE_LIVE_SPOT_MS)
export const LIVE_SPOT_INTERVAL_MS =
  Number.isFinite(envSpot) && envSpot >= 5_000
    ? envSpot
    : coingeckoUsesPublicQuota()
      ? 10_000
      : 5_000

/** Délai avant le 1er tick spot (démarrage rapide tout en laissant passer le chargement initial). */
export const LIVE_SPOT_START_DELAY_MS = 600

/**
 * Rétention max du buffer spot (fenêtre la plus longue : 30 j + marge pour filtres / horloge).
 * Les points plus anciens sont écartés ; plafond de points en complément (voir merge côté UI).
 */
export const LIVE_BUFFER_MAX_MS = 40 * 24 * 60 * 60 * 1000

export const LIVE_BUFFER_MAX_POINTS = 35_000

/** Rafraîchissement hub supplies (`api.rayls.com`). Défaut 60 s — `VITE_OFFICIAL_HUB_POLL_MS`, minimum 15 s. */
const envHub = Number(import.meta.env.VITE_OFFICIAL_HUB_POLL_MS)
export const OFFICIAL_HUB_REFRESH_MS =
  Number.isFinite(envHub) && envHub >= 15_000 ? envHub : 60_000

/**
 * Polling RPC mainnet (batch JSON-RPC). Défaut 1 s — `VITE_RPC_POLL_MS`, min 300 ms.
 * Les blocs peuvent aussi arriver en push WebSocket (`newHeads`) quand le endpoint le permet.
 */
const envRpcPoll = Number(import.meta.env.VITE_RPC_POLL_MS)
export const RPC_POLL_INTERVAL_MS =
  Number.isFinite(envRpcPoll) && envRpcPoll >= 300 ? envRpcPoll : 1000

/** Plafond du backoff après erreurs RPC (ms). */
export const RPC_POLL_BACKOFF_MAX_MS = 30_000

/** SLO visuel : latence HTTP au-delà de laquelle l’UI affiche un avertissement. */
export const RPC_SLO_LATENCY_WARN_MS = 1_500

/** SLO visuel : âge du dernier bloc (secondes) au-delà duquel l’UI signale un head « stale ». */
export const RPC_SLO_BLOCK_STALE_SEC = 120

/** Vérification du prochain batch RPC (sans setState global — le compteur fluide est en rAF local). */
export const RPC_DEADLINE_CHECK_MS = 400

/**
 * Actualités / flux JSON optionnel (voir `VITE_RAYLS_PUBLIC_FEED_URL`).
 * Défaut 6 h — `VITE_NEWS_REFRESH_MS`, minimum 30 min (1_800_000 ms).
 */
const envNews = Number(import.meta.env.VITE_NEWS_REFRESH_MS)
export const NEWS_AND_DOCS_REFRESH_MS =
  Number.isFinite(envNews) && envNews >= 1_800_000 ? envNews : 21_600_000


/** Libellé localisé pour une période de polling (ex. ~1 s, ~18 s, 6 h). */
export function formatPollInterval(ms: number, locale: Locale): string {
  const loc = localeTag(locale)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) {
    const s = ms / 1000
    const rounded = s >= 10 ? Math.round(s) : Math.round(s * 10) / 10
    const prefix = locale === 'fr' ? '~' : '~'
    return `${prefix}${rounded.toLocaleString(loc, { maximumFractionDigits: 1 })} s`
  }
  if (ms < 3_600_000) {
    const m = Math.max(1, Math.round(ms / 60_000))
    return locale === 'fr' ? `${m} min` : `${m} min`
  }
  const h = ms / 3_600_000
  if (Math.abs(h - Math.round(h)) < 0.001) {
    return locale === 'fr' ? `${Math.round(h)} h` : `${Math.round(h)} h`
  }
  return `${h.toLocaleString(loc, { maximumFractionDigits: 1 })} h`
}

/** @deprecated Utiliser formatPollInterval(ms, locale) */
export function formatPollIntervalFr(ms: number): string {
  return formatPollInterval(ms, 'fr')
}

