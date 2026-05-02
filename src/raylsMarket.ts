import { fetchWithTimeout } from './lib/fetchUtil'
import { isSafeHttpOrHttpsUrl } from './lib/safeUrl'
import { RAYLS_COINGECKO_ID } from './raylsConfig'

function trimEnv(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

/** Clé Pro (production directe vers pro-api) — en dev, préférez le proxy Vite + .env (voir vite.config). */
function cgProKey(): string {
  return trimEnv('VITE_COINGECKO_PRO_API_KEY')
}

function cgDemoKey(): string {
  return trimEnv('VITE_COINGECKO_DEMO_API_KEY')
}

/**
 * Aucune clé demo/pro ni `VITE_COINGECKO_API_ROOT` : quotas publics très serrés depuis le navigateur.
 * Sert à espacer davantage les appels lourds et à temporiser les retries 429.
 */
export function coingeckoUsesPublicQuota(): boolean {
  if (trimEnv('VITE_COINGECKO_API_ROOT')) return false
  if (cgProKey()) return false
  if (cgDemoKey()) return false
  return true
}

/**
 * Base API v3 :
 * - `VITE_COINGECKO_API_ROOT` : proxy / backend perso (recommandé en prod pour cacher la clé).
 * - Sinon Pro : `https://pro-api.coingecko.com/api/v3` si `VITE_COINGECKO_PRO_API_KEY` (hors dev proxy).
 * - Dev : `/api/coingecko` (proxy Vite injecte les en-têtes de clé, voir vite.config).
 */
export function getCgV3Base(): string {
  const env = trimEnv('VITE_COINGECKO_API_ROOT')
  if (env) return env.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api/coingecko'
  if (cgProKey()) return 'https://pro-api.coingecko.com/api/v3'
  return 'https://api.coingecko.com/api/v3'
}

/**
 * En dev avec proxy same-origin, les clés sont ajoutées par Vite (pas d’en-tête côté navigateur).
 * En prod, clés demo/pro passent ici (visibles dans le bundle — préférez un proxy pour la prod).
 *
 * Sans clé, vers l’API publique depuis le navigateur : ne pas envoyer `Accept: application/json`
 * (en-tête « non simple ») sinon le navigateur envoie un prévol OPTIONS ; CoinGecko/Cloudflare
 * répond souvent 429 sur OPTIONS → échec CORS masqué en « Failed to fetch » (ex. GitHub Pages).
 */
function getCgAuthHeaders(): Record<string, string> {
  const customRoot = trimEnv('VITE_COINGECKO_API_ROOT')
  const pro = cgProKey()
  if (pro) {
    return { 'x-cg-pro-api-key': pro, Accept: 'application/json' }
  }
  const demo = cgDemoKey()
  if (demo) {
    return { 'x-cg-demo-api-key': demo, Accept: 'application/json' }
  }
  if (import.meta.env.DEV && !customRoot) {
    return { Accept: 'application/json' }
  }
  return {}
}

/** TTL « frais » : au-delà, on refetch si besoin (limite les 429). */
const SIMPLE_FRESH_MS = 120_000
const COIN_FRESH_MS = 60 * 60 * 1000

/**
 * Entre deux appels réseau `simple/price` en mode live. `VITE_CG_QUOTE_MIN_GAP_MS` (min 3 s, défaut 7 s).
 * Un défaut inférieur à `LIVE_SPOT_INTERVAL_MS` évite que le tick spot renvoie un cache sans nouveau `fetchedAt`.
 */
const envQuoteGap = Number(import.meta.env.VITE_CG_QUOTE_MIN_GAP_MS)
const QUOTE_MIN_NETWORK_GAP_MS =
  Number.isFinite(envQuoteGap) && envQuoteGap >= 3_000 ? envQuoteGap : 7_000

/** Espace les requêtes CoinGecko pour éviter les rafales au chargement (plusieurs endpoints). */
let lastCgRequestDoneAt = 0
const CG_REQUEST_MIN_GAP_MS = 500

async function cgThrottle(): Promise<void> {
  const w = Math.max(0, CG_REQUEST_MIN_GAP_MS - (Date.now() - lastCgRequestDoneAt))
  if (w > 0) await new Promise((r) => setTimeout(r, w))
}

function cgMarkDone(): void {
  lastCgRequestDoneAt = Date.now()
}

function cgNetworkError(e: unknown): string {
  if (e instanceof TypeError) {
    const m = e.message || ''
    if (/failed to fetch|networkerror|load failed/i.test(m)) {
      let base =
        'Impossible de joindre CoinGecko (réseau, pare-feu ou blocage CORS). ' +
        'En local : `npm run dev` + proxy ; clé demo/pro dans `.env` (injectée par le proxy). ' +
        'En prod : `VITE_COINGECKO_API_ROOT` vers votre backend ou clés `VITE_COINGECKO_*_API_KEY`.'
      try {
        const host = globalThis.location?.hostname ?? ''
        if (/\.github\.io$/i.test(host) && !trimEnv('VITE_COINGECKO_API_ROOT')) {
          base +=
            ' Sur ce site : la variable dépôt **VITE_COINGECKO_API_ROOT** est vide dans le build — exécutez Actions → **Deploy CoinGecko CORS proxy** (ou ajoutez la variable à la main avec l’URL `*.workers.dev`).'
        }
      } catch {
        /* ignore */
      }
      return base
    }
  }
  return e instanceof Error ? e.message : String(e)
}

async function cgFetchRaw(url: string, headers: Record<string, string>): Promise<Response> {
  try {
    return await fetchWithTimeout(url, {
      headers,
      credentials: 'omit',
    })
  } catch (e) {
    const msg = cgNetworkError(e)
    throw new Error(msg, { cause: e })
  } finally {
    cgMarkDone()
  }
}

/** Une requête GET CoinGecko avec throttle, en-têtes d’auth, et une nouvelle tentative après 429. */
async function cgFetch(path: string): Promise<Response> {
  const base = getCgV3Base()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = getCgAuthHeaders()

  await cgThrottle()
  let res = await cgFetchRaw(url, headers)

  if (res.status === 429) {
    let waitSec = coingeckoUsesPublicQuota() ? 8 : 3
    const ra = res.headers.get('retry-after')
    if (ra) {
      const n = parseInt(ra, 10)
      if (Number.isFinite(n) && n > 0) waitSec = Math.min(60, Math.max(waitSec, n))
    }
    await new Promise((r) => setTimeout(r, waitSec * 1000))
    await cgThrottle()
    res = await cgFetchRaw(url, headers)
  }

  return res
}

export type TimeframeId =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '24h'
  | '7d'
  | '30d'

/**
 * Fenêtres spot : du court (minutes/heures) au 30 j. Chaque TF partage un `days` market_chart entier
 * avec les autres TF qui ont la même profondeur (ex. 1 min … 24 h → 1 jour) pour limiter les appels API.
 * Spot et dernier point : `simple/price` (temps réel, voir `VITE_LIVE_SPOT_MS`).
 */
export const TIMEFRAMES: { id: TimeframeId; label: string; hint: string }[] = [
  {
    id: '1m',
    label: '1 min',
    hint: 'Historique CoinGecko market_chart + fenêtre ~2 h ; spot live rafraîchi par simple/price.',
  },
  {
    id: '5m',
    label: '5 min',
    hint: 'Historique CoinGecko `market_chart` (~12 h à l’écran) + spot `simple/price` (rafraîchi selon config).',
  },
  {
    id: '15m',
    label: '15 min',
    hint: 'Historique CoinGecko (~48 h à l’écran) ; dernier point recalé sur `simple/price`.',
  },
  {
    id: '30m',
    label: '30 min',
    hint: 'Historique CoinGecko (~5 j à l’écran) + spot `simple/price`.',
  },
  { id: '1h', label: '1 h', hint: 'Fenêtre ~1 h sur `market_chart` + dernier point `simple/price`.' },
  { id: '24h', label: '24 h', hint: 'Journée glissante sur market_chart + live.' },
  { id: '7d', label: '7 j', hint: 'Historique 7 j (CoinGecko) ; spot actualisé en continu.' },
  { id: '30d', label: '30 j', hint: 'Historique 30 j (`days=30`), filtré côté client ; spot live.' },
]

/** Accès O(1) aux métadonnées de timeframe (évite des `.find` répétés dans le rendu). */
export const TIMEFRAME_BY_ID = new Map(TIMEFRAMES.map((t) => [t.id, t]))

export type MarketTrend = 'hausse' | 'baisse' | 'stable'

export type MarketSnapshot = {
  timeframe: TimeframeId
  prices: [number, number][]
  fetchedAt: number
  source: 'live'
}

/** Fenêtre d’affichage (ms) pour filtrer le buffer spot selon le timeframe sélectionné. */
export function timeframeLiveDisplayWindowMs(tf: TimeframeId): number {
  switch (tf) {
    case '1m':
      return 2 * 60 * 60 * 1000
    case '5m':
      return 12 * 60 * 60 * 1000
    case '15m':
      return 48 * 60 * 60 * 1000
    case '30m':
      return 5 * 24 * 60 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
    default:
      return 2 * 60 * 60 * 1000
  }
}

/** Jours à demander à CoinGecko `market_chart` pour couvrir la fenêtre d’affichage du timeframe. */
export function marketChartDaysForTimeframe(tf: TimeframeId): number {
  const w = timeframeLiveDisplayWindowMs(tf)
  const day = 24 * 60 * 60 * 1000
  return Math.min(366, Math.max(1, Math.ceil(w / day)))
}

/** Paramètre `days` de l’URL `market_chart` (entier ou `max` selon la doc CoinGecko). */
export type MarketChartDaysQuery = number | 'max'

/** Paramètre `days` pour `market_chart` : aligné sur la fenêtre (ex. 30 j → 30, pas `max`, charge API réduite). */
export function marketChartDaysQueryForTimeframe(tf: TimeframeId): MarketChartDaysQuery {
  return marketChartDaysForTimeframe(tf)
}

/**
 * Marge sous la borne gauche d’affichage : au-delà de ~2 j, granularité souvent horaire côté API ;
 * évite d’exclure toute la série quand `cut` tombe entre deux points.
 */
export function chartWindowFilterSlackMs(tf: TimeframeId): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const d = marketChartDaysForTimeframe(tf)
  if (d > 90) return MS_PER_DAY
  if (d >= 2) return 3600_000
  return 0
}

/**
 * Identifiant de la série `market_chart` côté UI : `days` réseau + devise (ex. 1 min … 24 h → `1:usd`, 30 j → `30:usd`).
 */
export function marketChartLoadedKey(tf: TimeframeId, vs: ChartVsCurrency): string {
  const q = marketChartDaysQueryForTimeframe(tf)
  return `${q === 'max' ? 'max' : String(q)}:${vs}`
}

/** Valeurs `days` acceptées par l’endpoint CoinGecko `ohlc`. */
const OHLC_ALLOWED_DAYS = [1, 7, 14, 30, 90, 180, 365] as const

export type OhlcDays = (typeof OHLC_ALLOWED_DAYS)[number]

/** Jours OHLC CoinGecko : plus petit palier autorisé qui couvre la fenêtre (30 j → `30`, pas 365). */
export function ohlcDaysForTimeframe(tf: TimeframeId): OhlcDays {
  const w = timeframeLiveDisplayWindowMs(tf)
  const day = 24 * 60 * 60 * 1000
  const needed = Math.max(1, Math.ceil(w / day))
  for (const d of OHLC_ALLOWED_DAYS) {
    if (d >= needed) return d
  }
  return 365
}

/** Aligné sur le paramètre `days` OHLC réel (plusieurs TF → une seule requête réseau). */
export function marketOhlcLoadedKey(tf: TimeframeId, vs: ChartVsCurrency): string {
  return `${ohlcDaysForTimeframe(tf)}:${vs}`
}

/**
 * Granularité imposée par CoinGecko pour `/coins/{id}/ohlc` (non paramétrable).
 * Ex. `days=1` → pas 1 min mais ~30 min ; sinon l’UI « 1 min » + bougies laissait 3–4 bougies sur 2 h.
 * @see https://docs.coingecko.com/reference/coins-id-ohlc
 */
export function coingeckoOhlcIntervalMs(days: OhlcDays): number {
  if (days === 1) return 30 * 60 * 1000
  if (days <= 90) return 4 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
}

/** Taille de bougie voulue côté UI pour le mode « Chandelier » (agrégation depuis la série ligne). */
export function timeframeCandleBucketMs(tf: TimeframeId): number {
  switch (tf) {
    case '1m':
      return 60_000
    case '5m':
      return 5 * 60_000
    case '15m':
      return 15 * 60_000
    case '30m':
      return 30 * 60_000
    case '1h':
      return 60 * 60_000
    case '24h':
      return 60 * 60_000
    case '7d':
      return 4 * 60 * 60_000
    case '30d':
      return 24 * 60 * 60_000
    default:
      return 60 * 60_000
  }
}

/** Utiliser des bougies dérivées de `market_chart` + buffer live plutôt que `/ohlc` (trop grossier). */
export function preferSyntheticCandles(tf: TimeframeId): boolean {
  const bucket = timeframeCandleBucketMs(tf)
  const days = ohlcDaysForTimeframe(tf)
  return bucket < coingeckoOhlcIntervalMs(days)
}

export function marketSyntheticOhlcLoadedKey(tf: TimeframeId, vs: ChartVsCurrency): string {
  return `synth:${tf}:${vs}`
}

/** Regroupe les points [t, prix] en bougies OHLC (t = début de bucket, aligné sur bucketMs). */
export function lineSeriesToOhlcCandles(points: [number, number][], bucketMs: number): OhlcCandle[] {
  if (points.length === 0 || bucketMs < 1) return []
  const sorted = [...points].filter(
    ([t, p]) => Number.isFinite(t) && Number.isFinite(p),
  ) as [number, number][]
  sorted.sort((a, b) => a[0] - b[0])
  const buckets = new Map<number, { o: number; h: number; l: number; c: number }>()
  for (const [t, p] of sorted) {
    const k = Math.floor(t / bucketMs) * bucketMs
    const ex = buckets.get(k)
    if (!ex) {
      buckets.set(k, { o: p, h: p, l: p, c: p })
    } else {
      ex.h = Math.max(ex.h, p)
      ex.l = Math.min(ex.l, p)
      ex.c = p
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ t, o: v.o, h: v.h, l: v.l, c: v.c }))
}

export type OhlcCandle = { t: number; o: number; h: number; l: number; c: number }

/** Dernière bougie : clôture / extrêmes recalés sur le spot live (même logique que le dernier point ligne). */
export function mergeOhlcWithLiveSpot(candles: OhlcCandle[], livePrice: number | null): OhlcCandle[] {
  if (candles.length === 0 || livePrice == null || !Number.isFinite(livePrice)) return candles
  const next = candles.slice()
  const last = { ...next[next.length - 1]! }
  last.c = livePrice
  last.h = Math.max(last.h, livePrice)
  last.l = Math.min(last.l, livePrice)
  next[next.length - 1] = last
  return next
}

/** Cache `market_chart` : TTL court pour garder les courbes proches du temps réel tout en limitant les 429. */
const CHART_FRESH_MS = 5 * 60 * 1000

/**
 * Espace minimal entre le **début** de deux appels réseau lourds `market_chart` / `ohlc`.
 * Les réponses encore « fraîches » (`CHART_FRESH_MS`) ne refont pas de requête — ce délai ne s’applique
 * qu’aux vrais allers-retour API. Défaut 6 s (équilibre 429 / réactivité quand on enchaîne les périodes).
 * Augmentez avec `VITE_CG_CHART_MIN_GAP_MS` si vous voyez des 429 (ex. 12000–20000).
 */
let lastMarketChartNetworkAt = 0
const envChartNetGap = Number(import.meta.env.VITE_CG_CHART_MIN_GAP_MS)
const MARKET_CHART_NETWORK_MIN_GAP_MS =
  Number.isFinite(envChartNetGap) && envChartNetGap >= 3_000
    ? envChartNetGap
    : coingeckoUsesPublicQuota()
      ? 18_000
      : 6_000

async function waitMarketChartNetworkGap(): Promise<void> {
  const w = Math.max(0, MARKET_CHART_NETWORK_MIN_GAP_MS - (Date.now() - lastMarketChartNetworkAt))
  if (w > 0) await new Promise((r) => setTimeout(r, w))
  lastMarketChartNetworkAt = Date.now()
}

/**
 * Délai après l’espacement « lourd » commun, **avant** `ohlc` uniquement.
 * L’endpoint OHLC arrive souvent juste après `market_chart` / `simple/price` → 429 sans clé.
 * `VITE_CG_OHLC_EXTRA_GAP_MS` (défaut 4500, min 0).
 */
const envOhlcExtraGap = Number(import.meta.env.VITE_CG_OHLC_EXTRA_GAP_MS)
const OHLC_EXTRA_GAP_MS =
  Number.isFinite(envOhlcExtraGap) && envOhlcExtraGap >= 0
    ? envOhlcExtraGap
    : coingeckoUsesPublicQuota()
      ? 10_000
      : 4_500

/** Seconde tentative OHLC après 429 (en plus des 2 essais internes à `cgFetch`). */
const OHLC_429_COOLDOWN_MS = 14_000

/** Devise de cotation pour `market_chart` (prix réels agrégés CoinGecko). */
export type ChartVsCurrency = 'usd' | 'eur'

const chartInflight = new Map<string, Promise<[number, number][]>>()

function chartCacheKey(d: number, vs: ChartVsCurrency): string {
  return `mchart:${d}:${vs}`
}

function chartCacheKeyForQuery(q: MarketChartDaysQuery, vs: ChartVsCurrency): string {
  return q === 'max' ? `mchart:max:${vs}` : chartCacheKey(q, vs)
}

function chartInflightKeyForQuery(q: MarketChartDaysQuery, vs: ChartVsCurrency): string {
  return `${q}:${vs}`
}

async function fetchCgMarketChartNetwork(q: MarketChartDaysQuery, vs: ChartVsCurrency): Promise<[number, number][]> {
  await waitMarketChartNetworkGap()
  const key = chartCacheKeyForQuery(q, vs)
  const path =
    q === 'max'
      ? `/coins/${RAYLS_COINGECKO_ID}/market_chart?vs_currency=${vs}&days=max`
      : `/coins/${RAYLS_COINGECKO_ID}/market_chart?vs_currency=${vs}&days=${Math.max(1, Math.min(366, Math.round(q)))}`
  let res = await cgFetch(path)
  if (res.status === 429) {
    let stale = cacheGetStale<[number, number][]>(key)
    if (!stale && q !== 'max') {
      stale = cacheGetStale<[number, number][]>(chartCacheKeyForQuery('max', vs))
    }
    if (stale) return stale
    const pauseMs = coingeckoUsesPublicQuota() ? 14_000 : 7_000
    await new Promise((r) => setTimeout(r, pauseMs))
    await cgThrottle()
    res = await cgFetch(path)
  }
  if (res.status === 429) {
    let stale = cacheGetStale<[number, number][]>(key)
    if (!stale && q !== 'max') {
      stale = cacheGetStale<[number, number][]>(chartCacheKeyForQuery('max', vs))
    }
    if (stale) return stale
    throw new Error(
      'CoinGecko market_chart : limite de débit (429). Ajoutez une clé demo/pro (`.env` + proxy Vite en local) ou `VITE_COINGECKO_API_ROOT`.',
    )
  }
  if (!res.ok) throw new Error(`CoinGecko market_chart ${res.status}`)
  const j = (await res.json()) as { prices?: [number, number][] }
  const raw = j.prices ?? []
  const out: [number, number][] = raw
    .filter(
      (x): x is [number, number] =>
        Array.isArray(x) && x.length >= 2 && typeof x[0] === 'number' && typeof x[1] === 'number',
    )
    .map(([t, p]) => {
      const ms = t < 1e11 ? Math.round(t * 1000) : Math.round(t)
      return [ms, p]
    })
  out.sort((a, b) => a[0] - b[0])
  if (out.length === 0) {
    throw new Error('CoinGecko market_chart : aucun point de prix (période ou devise).')
  }
  cacheSet(key, out)
  return out
}

/**
 * Historique de prix agrégé (CoinGecko `market_chart`). Granularité imposée par l’API selon la plage.
 * Mis en cache plusieurs minutes par couple (`days`, `vs`) ; espacement minimal entre appels réseau.
 */
export async function fetchCgMarketChart(
  daysQuery: MarketChartDaysQuery,
  vs: ChartVsCurrency = 'usd',
): Promise<[number, number][]> {
  const inflightKey = chartInflightKeyForQuery(daysQuery, vs)
  const key = chartCacheKeyForQuery(daysQuery, vs)
  const hit = cacheGetFresh<[number, number][]>(key, CHART_FRESH_MS)
  if (hit) return hit

  let p = chartInflight.get(inflightKey)
  if (!p) {
    p = fetchCgMarketChartNetwork(daysQuery, vs).finally(() => {
      chartInflight.delete(inflightKey)
    })
    chartInflight.set(inflightKey, p)
  }
  return p
}

/** Cache `ohlc` : TTL plus long que `market_chart` (moins de rafales sur un quota serré). */
const OHLC_FRESH_MS = 12 * 60 * 1000

const ohlcInflight = new Map<string, Promise<OhlcCandle[]>>()

function ohlcCacheKey(days: OhlcDays, vs: ChartVsCurrency): string {
  return `ohlc:${days}:${vs}`
}

function parseCgOhlcJson(j: unknown): OhlcCandle[] {
  if (!Array.isArray(j)) return []
  const out: OhlcCandle[] = []
  for (const row of j) {
    if (!Array.isArray(row) || row.length < 5) continue
    const [t0, o, h, l, c] = row
    if (
      typeof t0 !== 'number' ||
      typeof o !== 'number' ||
      typeof h !== 'number' ||
      typeof l !== 'number' ||
      typeof c !== 'number'
    ) {
      continue
    }
    const ms = t0 < 1e11 ? Math.round(t0 * 1000) : Math.round(t0)
    out.push({ t: ms, o, h, l, c })
  }
  return out
}

/** Repli 429 : toute série OHLC en cache pour cette devise (du plus long au plus court). */
function ohlcStaleAnyVs(vs: ChartVsCurrency): OhlcCandle[] | null {
  for (let i = OHLC_ALLOWED_DAYS.length - 1; i >= 0; i--) {
    const d = OHLC_ALLOWED_DAYS[i]!
    const s = cacheGetStale<OhlcCandle[]>(ohlcCacheKey(d, vs))
    if (s && s.length > 0) return s
  }
  return null
}

async function fetchCgOhlcNetwork(days: OhlcDays, vs: ChartVsCurrency): Promise<OhlcCandle[]> {
  await waitMarketChartNetworkGap()
  if (OHLC_EXTRA_GAP_MS > 0) {
    await new Promise((r) => setTimeout(r, OHLC_EXTRA_GAP_MS))
  }
  const key = ohlcCacheKey(days, vs)
  const path = `/coins/${RAYLS_COINGECKO_ID}/ohlc?vs_currency=${vs}&days=${days}`

  let res = await cgFetch(path)
  if (res.status === 429) {
    let stale = cacheGetStale<OhlcCandle[]>(key)
    if (!stale) stale = ohlcStaleAnyVs(vs)
    if (stale) return stale
    await new Promise((r) => setTimeout(r, OHLC_429_COOLDOWN_MS))
    await cgThrottle()
    res = await cgFetch(path)
  }
  if (res.status === 429) {
    let stale = cacheGetStale<OhlcCandle[]>(key)
    if (!stale) stale = ohlcStaleAnyVs(vs)
    if (stale) return stale
    throw new Error(
      'CoinGecko ohlc : limite de débit (429). Créez `.env` avec VITE_COINGECKO_DEMO_API_KEY (dev : proxy Vite) ou VITE_COINGECKO_API_ROOT en prod — voir `.env.example`.',
    )
  }
  if (!res.ok) throw new Error(`CoinGecko ohlc ${res.status}`)
  const parsed = parseCgOhlcJson(await res.json())
  parsed.sort((a, b) => a.t - b.t)
  if (parsed.length === 0) {
    throw new Error('CoinGecko ohlc : réponse sans bougies pour cette période.')
  }
  cacheSet(key, parsed)
  return parsed
}

/**
 * Bougies OHLC agrégées (CoinGecko `/coins/{id}/ohlc`). Paramètre `days` restreint aux valeurs API.
 * Cache et espacement réseau alignés sur `market_chart`.
 */
export async function fetchCgOhlc(days: OhlcDays, vs: ChartVsCurrency = 'usd'): Promise<OhlcCandle[]> {
  const d = days
  const inflightKey = `${d}:${vs}`
  const key = ohlcCacheKey(d, vs)
  const hit = cacheGetFresh<OhlcCandle[]>(key, OHLC_FRESH_MS)
  if (hit) return hit

  let p = ohlcInflight.get(inflightKey)
  if (!p) {
    p = fetchCgOhlcNetwork(d, vs).finally(() => {
      ohlcInflight.delete(inflightKey)
    })
    ohlcInflight.set(inflightKey, p)
  }
  return p
}

export type SimpleQuote = {
  usd: number
  /** Prix spot agrégé en EUR (même instantané que `usd`). */
  eur: number | null
  usd24hChange: number | null
  eur24hChange: number | null
  fetchedAt: number
  /**
   * Origine du prix USD affiché. `mexc` = carnet / trades publics MEXC (WebSocket) ;
   * `coingecko` = agrégat CoinGecko (simple/price).
   */
  usdSource?: 'coingecko' | 'mexc'
  /**
   * Dernier snapshot `simple/price` CoinGecko (agrégat marché), pour aligner la courbe sur la même source que `market_chart`
   * même lorsque `usd` affiché provient de MEXC.
   */
  cgSpotUsd?: number
  cgSpotEur?: number | null
  cgSpotAt?: number
}

const cache = new Map<string, { at: number; data: unknown }>()

function cacheGetFresh<T>(key: string, ttlMs: number): T | null {
  const row = cache.get(key)
  if (!row || Date.now() - row.at > ttlMs) return null
  return row.data as T
}

/** Donnée en cache même expirée (repli 429 / erreur). */
function cacheGetStale<T>(key: string): T | null {
  const row = cache.get(key)
  if (!row) return null
  return row.data as T
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data })
}

function parseSimpleQuoteJson(j: unknown): SimpleQuote {
  const o = j as {
    rayls?: {
      usd: number
      eur?: number
      usd_24h_change?: number
      eur_24h_change?: number
    }
  }
  const row = o.rayls
  if (!row || typeof row.usd !== 'number') throw new Error('Prix RLS indisponible')
  const eur = typeof row.eur === 'number' && Number.isFinite(row.eur) ? row.eur : null
  return {
    usd: row.usd,
    eur,
    usd24hChange: typeof row.usd_24h_change === 'number' ? row.usd_24h_change : null,
    eur24hChange: typeof row.eur_24h_change === 'number' ? row.eur_24h_change : null,
    fetchedAt: Date.now(),
    usdSource: 'coingecko',
  }
}

let simpleQuoteInflight: Promise<SimpleQuote> | null = null

async function fetchSimpleQuoteNetwork(): Promise<SimpleQuote> {
  const path = `/simple/price?ids=${RAYLS_COINGECKO_ID}&vs_currencies=usd,eur&include_24hr_change=true`
  let res = await cgFetch(path)
  if (res.status === 429) {
    const staleFirst = cacheGetStale<SimpleQuote>('simple')
    if (staleFirst) return staleFirst
    await new Promise((r) => setTimeout(r, coingeckoUsesPublicQuota() ? 11_000 : 5_000))
    await cgThrottle()
    res = await cgFetch(path)
  }
  if (res.status === 429) {
    const staleRetry = cacheGetStale<SimpleQuote>('simple')
    if (staleRetry) return staleRetry
    throw new Error(
      'CoinGecko : limite de débit (429). Ajoutez VITE_COINGECKO_DEMO_API_KEY (voir .env.example) ou un proxy VITE_COINGECKO_API_ROOT.',
    )
  }
  if (!res.ok) throw new Error(`CoinGecko simple/price ${res.status}`)
  const out = parseSimpleQuoteJson(await res.json())
  cacheSet('simple', out)
  return out
}

/** Quote spot ; cache « frais » sauf `refresh` (flux live). Requêtes concurrentes fusionnées. */
export async function fetchCgSimpleQuote(opts?: { refresh?: boolean }): Promise<SimpleQuote> {
  const key = 'simple'
  if (!opts?.refresh) {
    const hit = cacheGetFresh<SimpleQuote>(key, SIMPLE_FRESH_MS)
    if (hit) return hit
  } else {
    const row = cache.get(key)
    if (row && Date.now() - row.at < QUOTE_MIN_NETWORK_GAP_MS) {
      const data = row.data as SimpleQuote
      return {
        usd: data.usd,
        eur: data.eur ?? null,
        usd24hChange: data.usd24hChange ?? null,
        eur24hChange: data.eur24hChange ?? null,
        fetchedAt: data.fetchedAt,
      }
    }
  }
  if (!simpleQuoteInflight) {
    simpleQuoteInflight = fetchSimpleQuoteNetwork().finally(() => {
      simpleQuoteInflight = null
    })
  }
  return simpleQuoteInflight
}

export function analyzeTrend(prices: [number, number][]): {
  trend: MarketTrend
  changePct: number
  high: number
  low: number
  open: number
  close: number
  points: number
} {
  const n = prices.length
  if (n < 2) {
    return { trend: 'stable', changePct: 0, high: 0, low: 0, open: 0, close: 0, points: n }
  }
  const open = prices[0]![1]
  const close = prices[n - 1]![1]
  let high = open
  let low = open
  for (let i = 1; i < n; i++) {
    const v = prices[i]![1]
    if (v > high) high = v
    if (v < low) low = v
  }
  const changePct = open !== 0 ? ((close - open) / open) * 100 : 0
  const eps = 0.02
  let trend: MarketTrend = 'stable'
  if (changePct > eps) trend = 'hausse'
  else if (changePct < -eps) trend = 'baisse'
  return { trend, changePct, high, low, open, close, points: n }
}

export type CoinDetailLite = {
  descriptionEn: string
  links: { title: string; url: string }[]
  fetchedAt: number
}

const GLOBAL_AGG_FRESH_MS = 90_000
const CACHE_KEY_COIN_GLOBAL = 'coin-global'
const CACHE_KEY_COIN_LITE = 'coin-lite'

/** Agrégats mondiaux CoinGecko (même instantané API — pas tous les marchés du monde). */
export type CoinGeckoAggregated = {
  fetchedAt: number
  name: string
  symbol: string
  coingeckoRank: number | null
  marketCapRank: number | null
  currentPriceUsd: number | null
  currentPriceEur: number | null
  marketCapUsd: number | null
  totalVolumeUsd: number | null
  high24hUsd: number | null
  low24hUsd: number | null
  priceChange24hPct: number | null
  priceChange7dPct: number | null
  priceChange30dPct: number | null
  athUsd: number | null
  athDate: string | null
  atlUsd: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  fullyDilutedValuationUsd: number | null
}

function usdObj(obj: unknown): number | null {
  if (!obj || typeof obj !== 'object') return null
  const u = (obj as { usd?: number }).usd
  return typeof u === 'number' && Number.isFinite(u) ? u : null
}

function eurObj(obj: unknown): number | null {
  if (!obj || typeof obj !== 'object') return null
  const u = (obj as { eur?: number }).eur
  return typeof u === 'number' && Number.isFinite(u) ? u : null
}

function parseCoinGeckoGlobal(j: unknown): CoinGeckoAggregated {
  const o = j as {
    name?: string
    symbol?: string
    coingecko_rank?: number
    market_cap_rank?: number
    market_data?: Record<string, unknown>
  }
  const md = o.market_data ?? {}
  const pct = (k: string): number | null => {
    const v = md[k]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
  const athDateRaw = md.ath_date as Record<string, string> | undefined
  return {
    fetchedAt: Date.now(),
    name: typeof o.name === 'string' ? o.name : 'Rayls',
    symbol: typeof o.symbol === 'string' ? o.symbol.toUpperCase() : 'RLS',
    coingeckoRank: typeof o.coingecko_rank === 'number' ? o.coingecko_rank : null,
    marketCapRank: typeof o.market_cap_rank === 'number' ? o.market_cap_rank : null,
    currentPriceUsd: usdObj(md.current_price),
    currentPriceEur: eurObj(md.current_price),
    marketCapUsd: usdObj(md.market_cap),
    totalVolumeUsd: usdObj(md.total_volume),
    high24hUsd: usdObj(md.high_24h),
    low24hUsd: usdObj(md.low_24h),
    priceChange24hPct: pct('price_change_percentage_24h'),
    priceChange7dPct: pct('price_change_percentage_7d'),
    priceChange30dPct: pct('price_change_percentage_30d'),
    athUsd: usdObj(md.ath),
    athDate: athDateRaw?.usd ?? null,
    atlUsd: usdObj(md.atl),
    circulatingSupply: typeof md.circulating_supply === 'number' ? md.circulating_supply : null,
    totalSupply: typeof md.total_supply === 'number' ? md.total_supply : null,
    maxSupply: typeof md.max_supply === 'number' ? md.max_supply : null,
    fullyDilutedValuationUsd: usdObj(md.fully_diluted_valuation),
  }
}

/** Extrait description + liens depuis la réponse JSON complète `coins/{id}` (market_data true ou false). */
function parseCoinDetailLiteFromJson(j: unknown): CoinDetailLite {
  const o = j as {
    description?: { en?: string }
    links?: {
      homepage?: string[]
      whitepaper?: string
      blockchain_site?: string[]
    }
  }
  const desc = (o.description?.en || '').replace(/\r/g, '').trim()
  const links: { title: string; url: string }[] = []
  const add = (title: string, u: string | undefined) => {
    const s = (u || '').trim()
    if (s && isSafeHttpOrHttpsUrl(s)) links.push({ title, url: s })
  }
  add('Site', o.links?.homepage?.[0])
  add('Litepaper / docs', o.links?.whitepaper)
  const bs = o.links?.blockchain_site || []
  add('Etherscan', bs[0])
  add('BscScan', bs[2])
  return {
    descriptionEn: desc.slice(0, 1200),
    links: links.slice(0, 12),
    fetchedAt: Date.now(),
  }
}

function coinDocumentNeedsNetwork(): boolean {
  return (
    cacheGetFresh<CoinGeckoAggregated>(CACHE_KEY_COIN_GLOBAL, GLOBAL_AGG_FRESH_MS) == null ||
    cacheGetFresh<CoinDetailLite>(CACHE_KEY_COIN_LITE, COIN_FRESH_MS) == null
  )
}

let coinDocumentInflight: Promise<void> | null = null

async function fetchCoinDocumentOnce(): Promise<void> {
  const path = `/coins/${RAYLS_COINGECKO_ID}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  const res = await cgFetch(path)
  if (res.status === 429) {
    return
  }
  if (!res.ok) throw new Error(`CoinGecko coin ${res.status}`)
  const j = await res.json()
  cacheSet(CACHE_KEY_COIN_GLOBAL, parseCoinGeckoGlobal(j))
  cacheSet(CACHE_KEY_COIN_LITE, parseCoinDetailLiteFromJson(j))
}

async function ensureCoinGeckoCoinDocument(): Promise<void> {
  if (!coinDocumentNeedsNetwork()) return
  if (!coinDocumentInflight) {
    coinDocumentInflight = fetchCoinDocumentOnce().finally(() => {
      coinDocumentInflight = null
    })
  }
  await coinDocumentInflight
}

export async function fetchCgCoinGeckoGlobal(): Promise<CoinGeckoAggregated> {
  const hit = cacheGetFresh<CoinGeckoAggregated>(CACHE_KEY_COIN_GLOBAL, GLOBAL_AGG_FRESH_MS)
  if (hit) return hit
  await ensureCoinGeckoCoinDocument()
  const again = cacheGetFresh<CoinGeckoAggregated>(CACHE_KEY_COIN_GLOBAL, GLOBAL_AGG_FRESH_MS)
  if (again) return again
  const stale = cacheGetStale<CoinGeckoAggregated>(CACHE_KEY_COIN_GLOBAL)
  if (stale) return stale
  throw new Error('CoinGecko agrégats : 429 — clé demo/pro ou proxy (voir .env.example).')
}

export async function fetchCgCoinDetailLite(): Promise<CoinDetailLite> {
  const hit = cacheGetFresh<CoinDetailLite>(CACHE_KEY_COIN_LITE, COIN_FRESH_MS)
  if (hit) return hit
  await ensureCoinGeckoCoinDocument()
  const again = cacheGetFresh<CoinDetailLite>(CACHE_KEY_COIN_LITE, COIN_FRESH_MS)
  if (again) return again
  const stale = cacheGetStale<CoinDetailLite>(CACHE_KEY_COIN_LITE)
  if (stale) return stale
  throw new Error(
    'CoinGecko coin : 429 — configurez VITE_COINGECKO_DEMO_API_KEY ou VITE_COINGECKO_API_ROOT (voir .env.example).',
  )
}
