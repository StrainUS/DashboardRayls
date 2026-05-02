import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  TIMEFRAME_BY_ID,
  type TimeframeId,
  type ChartVsCurrency,
  fetchCgSimpleQuote,
  fetchCgMarketChart,
  marketChartDaysForTimeframe,
  analyzeTrend,
  timeframeLiveDisplayWindowMs,
  type MarketSnapshot,
  type SimpleQuote,
} from '../../raylsMarket'
import {
  LIVE_BUFFER_MAX_MS,
  LIVE_BUFFER_MAX_POINTS,
  LIVE_SPOT_INTERVAL_MS,
  LIVE_SPOT_START_DELAY_MS,
} from '../../constants/dashboard'
import {
  connectMexcSpotStream,
  mexcSpotStreamEnabled,
  type MexcSpotStreamStatus,
} from '../../lib/mexcSpotStream'
import { mergeCgQuoteWithMexc, mexcTickToQuote, quoteShallowEqual } from '../../lib/marketQuoteMerge'
import { PriceChartCanvas } from './PriceChartCanvas'

/** Buffer spot : rétention max + plafond de points + fusion si deux cotations très proches. */
function mergeLiveSample(series: [number, number][], ts: number, usd: number): [number, number][] {
  const now = Date.now()
  const cut = now - LIVE_BUFFER_MAX_MS
  let next = series.filter(([t]) => t >= cut)
  const last = next[next.length - 1]
  if (last && Math.abs(last[0] - ts) < 1500) {
    next = [...next.slice(0, -1), [ts, usd]]
  } else {
    next = [...next, [ts, usd]]
  }
  if (next.length > LIVE_BUFFER_MAX_POINTS) {
    next = next.slice(-LIVE_BUFFER_MAX_POINTS)
  }
  if (next.length < 2) return next
  for (let i = 1; i < next.length; i++) {
    if (next[i]![0] < next[i - 1]![0]) {
      return [...next].sort((a, b) => a[0] - b[0])
    }
  }
  return next
}

/** Libellé lisible pour la fenêtre d’affichage (évite 525600 min sur 1 an). */
function liveWindowLabel(tf: TimeframeId): string {
  const ms = timeframeLiveDisplayWindowMs(tf)
  const mins = Math.round(ms / 60_000)
  if (mins < 240) return `${mins} min`
  const days = ms / (24 * 60 * 60 * 1000)
  if (days < 14) return `${Math.round(days * 10) / 10} j`
  return `${Math.round(days)} j`
}

/** Dernier point de la série CG recollé sur le spot live (simple/price). */
function mergeChartWithLive(chart: [number, number][], liveUsd: number, liveAt: number): [number, number][] {
  if (!Number.isFinite(liveUsd)) return chart
  if (chart.length === 0) return [[liveAt, liveUsd]]
  const next = chart.slice()
  const last = next[next.length - 1]!
  if (liveAt - last[0] < 90_000) {
    next[next.length - 1] = [liveAt, liveUsd]
  } else {
    next.push([liveAt, liveUsd])
  }
  return next
}

/** Ne trie que si les timestamps ne sont plus monotones (cas rare après fusion). */
function ensureTimeSorted(pts: [number, number][]): [number, number][] {
  if (pts.length < 2) return pts
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]![0] < pts[i - 1]![0]) {
      return [...pts].sort((a, b) => a[0] - b[0])
    }
  }
  return pts
}

type TimeframeScale = 'min' | 'h' | 'd'

const TIMEFRAMES_BY_SCALE: Record<TimeframeScale, TimeframeId[]> = {
  min: ['1m', '5m', '15m', '30m'],
  h: ['1h', '24h'],
  d: ['7d', '30d', '90d', '1y'],
}

const TF_SCALE_ORDER: TimeframeScale[] = ['min', 'h', 'd']

const TF_SCALE_UI: Record<TimeframeScale, { label: string; title: string }> = {
  min: { label: 'Minutes', title: 'Courtes périodes (minutes)' },
  h: { label: 'Heures', title: 'Vue heures' },
  d: { label: 'Jours', title: 'Historique sur plusieurs jours' },
}

function timeframeScale(tf: TimeframeId): TimeframeScale {
  if (tf === '1m' || tf === '5m' || tf === '15m' || tf === '30m') return 'min'
  if (tf === '1h' || tf === '24h') return 'h'
  return 'd'
}

/** Valeur sentinelle : l’UI affiche un encart structuré plutôt qu’un long paragraphe. */
const MARKET_ERR_CG429 = '\u200BCG429\u200B'

function formatCoinGeckoErrors(messages: string[]): string | null {
  if (messages.length === 0) return null
  const uniq = [...new Set(messages)]
  const allRateLimited = uniq.every((m) => /429|limite de débit/i.test(m))
  if (allRateLimited) return MARKET_ERR_CG429
  return uniq.join(' · ')
}

function CoinGecko429Callout() {
  return (
    <div
      className="dash-alert dash-alert--warn dash-alert--inline dash-alert--cg429"
      role="status"
    >
      <p className="dash-alert__title">CoinGecko · quota dépassé (429)</p>
      <p className="dash-alert__text">
        L’app s’appuie sur le cache quand il est encore utilisable. Sans clé API, les appels sont déjà
        espacés (~18&nbsp;s).
      </p>
      <ul className="dash-alert__list">
        <li>
          <strong>Local</strong> : <code>VITE_COINGECKO_DEMO_API_KEY</code> dans <code>.env</code> — le proxy
          Vite envoie la clé, elle n’est pas dans le JS du navigateur.
        </li>
        <li>
          <strong>Production</strong> : <code>VITE_COINGECKO_API_ROOT</code> (recommandé) ou clé pro —{' '}
          <code>.env.example</code>.
        </li>
      </ul>
    </div>
  )
}

const SPOT_SYNC_TICK_MS = 1000

/** Horloge locale pour faire défiler l’âge « maj il y a … » en quasi temps réel (pause si onglet masqué). */
function useSpotSyncLiveClock(active: boolean): number {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let id: number | undefined
    const start = () => {
      id = window.setInterval(() => setT(Date.now()), SPOT_SYNC_TICK_MS)
    }
    const stop = () => {
      if (id !== undefined) window.clearInterval(id)
      id = undefined
    }
    const onVis = () => {
      setT(Date.now())
      if (document.hidden) stop()
      else if (id === undefined) start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active])
  return t
}

function formatSpotWallTimeMs(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  })
}

/** Âge écoulé depuis la cotation, format FR (décimales pour le côté « millimétrique »). */
function formatSpotAgeFr(nowMs: number, fetchedAt: number): string {
  const ms = Math.max(0, nowMs - fetchedAt)
  const sec = ms / 1000
  if (sec < 60) return `${sec.toFixed(2).replace('.', ',')} s`
  if (sec < 3600) return `${(sec / 60).toFixed(1).replace('.', ',')} min`
  return `${(sec / 3600).toFixed(2).replace('.', ',')} h`
}

/**
 * Horloge ~60 Hz pour le graphique : fenêtre glissante et dernier point alignés sur l’instant présent.
 * (Les prix viennent toujours de CoinGecko selon `LIVE_SPOT_INTERVAL_MS` ; l’axe temps est temps réel local.)
 */
function useChartRafClock(): number {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    let raf = 0
    const loop = () => {
      setNowMs(Date.now())
      if (document.hidden) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (raf) return
      setNowMs(Date.now())
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVis = () => {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return nowMs
}

type MarketSpotVizProps = {
  tf: TimeframeId
  chartCurrency: ChartVsCurrency
  quote: SimpleQuote | null
  liveSeries: [number, number][]
  liveSeriesEur: [number, number][]
  histSeries: [number, number][]
  histLoadedKey: string | null
  loading: boolean
  histLoading: boolean
  err: string | null
  histErr: string | null
}

/**
 * Bandeau spot + courbe : horloge rAF interne pour ne pas re-rendir la barre d’outils ~60×/s.
 */
function MarketSpotViz({
  tf,
  chartCurrency,
  quote,
  liveSeries,
  liveSeriesEur,
  histSeries,
  histLoadedKey,
  loading,
  histLoading,
  err,
  histErr,
}: MarketSpotVizProps) {
  const chartNowMs = useChartRafClock()

  const displayPrices = useMemo(() => {
    const w = timeframeLiveDisplayWindowMs(tf)
    const now = chartNowMs
    const cut = now - w
    const liveBuf = chartCurrency === 'eur' ? liveSeriesEur : liveSeries
    const days = marketChartDaysForTimeframe(tf)
    const histKey = `${days}:${chartCurrency}`

    let base: [number, number][]
    if (histLoadedKey === histKey && histSeries.length > 0) {
      const filtered = histSeries.filter(([t]) => t >= cut)
      base =
        filtered.length >= 2
          ? filtered
          : histSeries.slice(-Math.min(2000, histSeries.length))
    } else {
      if (liveBuf.length === 0) return []
      const lastT = liveBuf[liveBuf.length - 1]![0]
      base = liveBuf.filter(([t]) => t >= Math.max(cut, lastT - w))
    }

    const liveSpot =
      chartCurrency === 'eur'
        ? quote?.eur != null && Number.isFinite(quote.eur)
          ? quote.eur
          : null
        : quote != null && Number.isFinite(quote.usd)
          ? quote.usd
          : null
    let merged = liveSpot != null ? mergeChartWithLive(base, liveSpot, now) : base
    merged = ensureTimeSorted(merged)

    /** Au moins 2 timestamps distincts : sinon le canvas reste vide alors qu’on a un spot (ex. 429 puis cache partiel). */
    if (merged.length < 2 && liveSpot != null && Number.isFinite(liveSpot)) {
      const windowMs = timeframeLiveDisplayWindowMs(tf)
      const span = Math.min(Math.max(windowMs / 24, 60_000), 4 * 3_600_000)
      merged = [
        [now - span, liveSpot],
        [now, liveSpot],
      ]
    } else if (merged.length === 1) {
      const [t, y] = merged[0]!
      const dt = Math.max(1_000, Math.min(120_000, (now - t) * 0.02 + 5_000))
      merged = ensureTimeSorted([
        [Math.min(t, now) - dt, y],
        [now, y],
      ])
    }

    return merged
  }, [histSeries, histLoadedKey, liveSeries, liveSeriesEur, tf, quote, chartNowMs, chartCurrency])

  const snapshotFetchedAt = quote?.fetchedAt ?? chartNowMs

  const displaySnap: MarketSnapshot | null =
    displayPrices.length >= 2
      ? {
          timeframe: tf,
          prices: displayPrices,
          fetchedAt: snapshotFetchedAt,
          source: 'live',
        }
      : null

  const analysis = displaySnap ? analyzeTrend(displaySnap.prices) : null
  const tfLabel = TIMEFRAME_BY_ID.get(tf)?.label ?? tf
  const liveBufLen = (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length
  const errBlocksChart = err != null && err !== MARKET_ERR_CG429
  const chartLoading =
    !displaySnap &&
    (loading || histLoading) &&
    !errBlocksChart &&
    !histErr &&
    quote == null &&
    liveBufLen === 0
  const windowLbl = liveWindowLabel(tf)

  return (
    <>
      <div className="market-spot-strip" aria-label="Indicateurs spot et tendance">
        <div className="stat-block stat-block--strip">
          <div className="label">Prix spot (USD)</div>
          <div className="value price-val price-val--strip">
            {quote
              ? `$${quote.usd.toLocaleString('fr-FR', { minimumFractionDigits: 8, maximumFractionDigits: 10 })}`
              : loading
                ? '…'
                : '—'}
          </div>
          {quote?.usd24hChange != null && (
            <div className={`delta delta--strip ${quote.usd24hChange >= 0 ? 'delta--up' : 'delta--down'}`}>
              24 h {quote.usd24hChange >= 0 ? '+' : ''}
              {quote.usd24hChange.toFixed(2)} %
            </div>
          )}
        </div>
        <div className="stat-block stat-block--strip">
          <div className="label">Prix spot (EUR)</div>
          <div className="value price-val price-val--strip">
            {quote?.eur != null && Number.isFinite(quote.eur)
              ? `${quote.eur.toLocaleString('fr-FR', { minimumFractionDigits: 8, maximumFractionDigits: 10 })} €`
              : loading
                ? '…'
                : '—'}
          </div>
          {quote?.eur24hChange != null && (
            <div className={`delta delta--strip ${quote.eur24hChange >= 0 ? 'delta--up' : 'delta--down'}`}>
              24 h {quote.eur24hChange >= 0 ? '+' : ''}
              {quote.eur24hChange.toFixed(2)} %
            </div>
          )}
        </div>
        <div className="stat-block stat-block--strip trend-block">
          <div className="label">
            Tendance ({tfLabel}) · {chartCurrency.toUpperCase()}
          </div>
          {analysis ? (
            <>
              <div className={`trend-badge trend-badge--strip trend--${analysis.trend}`}>
                {analysis.trend === 'hausse' && 'Hausse'}
                {analysis.trend === 'baisse' && 'Baisse'}
                {analysis.trend === 'stable' && 'Stable'}
              </div>
              <div className="sub sub--strip">
                {analysis.changePct >= 0 ? '+' : ''}
                {analysis.changePct.toFixed(2)} % · {analysis.points} pts
              </div>
            </>
          ) : (
            <div className="sub sub--strip">—</div>
          )}
        </div>
      </div>
      <div className="chart-wrap chart-wrap--tall chart-wrap--hero chart-wrap--in-stack">
        {displaySnap && displaySnap.prices.length > 1 ? (
          <PriceChartCanvas key={`${tf}-${chartCurrency}`} vsCurrency={chartCurrency} prices={displaySnap.prices} />
        ) : (
          <div className="chart-placeholder">
            {chartLoading
              ? 'Chargement courbe…'
              : displayPrices.length < 2
                ? histErr && (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length < 2
                  ? 'Pas de données — vérifiez le réseau ou le quota CoinGecko.'
                  : (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length < 2 && !histLoading
                    ? `En attente de données (historique + spot ~${Math.ceil(LIVE_SPOT_INTERVAL_MS / 1000)} s).`
                    : `Pas assez de points pour la fenêtre (~${windowLbl}).`
                : err && !quote
                  ? '—'
                  : 'Pas assez de points'}
          </div>
        )}
      </div>
    </>
  )
}

export function MarketPanel() {
  const [tf, setTf] = useState<TimeframeId>('15m')
  const [chartCurrency, setChartCurrency] = useState<ChartVsCurrency>('usd')
  const [quote, setQuote] = useState<SimpleQuote | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [liveErr, setLiveErr] = useState<string | null>(null)
  const [liveSeries, setLiveSeries] = useState<[number, number][]>([])
  const [liveSeriesEur, setLiveSeriesEur] = useState<[number, number][]>([])
  const [histSeries, setHistSeries] = useState<[number, number][]>([])
  /** Série `histSeries` valide uniquement pour ce couple (évite d’afficher un historique d’un autre TF / devise). */
  const [histLoadedKey, setHistLoadedKey] = useState<string | null>(null)
  const [histLoading, setHistLoading] = useState(true)
  const [histErr, setHistErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loadSeq = useRef(0)
  const liveSeq = useRef(0)
  const liveTimeoutRef = useRef(0)
  const liveBackoffMsRef = useRef(LIVE_SPOT_INTERVAL_MS)
  const chartCcyRef = useRef(chartCurrency)
  const histReqId = useRef(0)
  const mexcLiveRef = useRef(false)
  const [mexcStreamStatus, setMexcStreamStatus] = useState<MexcSpotStreamStatus>('idle')

  useEffect(() => {
    chartCcyRef.current = chartCurrency
  }, [chartCurrency])

  useEffect(() => {
    if (!mexcSpotStreamEnabled()) return
    return connectMexcSpotStream({
      onStatus: (s) => {
        setMexcStreamStatus(s)
        mexcLiveRef.current = s === 'open'
      },
      onPrice: (tick) => {
        setQuote((prev) => {
          const { next, eurForSeries } = mexcTickToQuote(prev, tick)
          queueMicrotask(() => {
            setLiveSeries((p) => mergeLiveSample(p, tick.at, tick.usd))
            if (eurForSeries != null) {
              setLiveSeriesEur((p) => mergeLiveSample(p, tick.at, eurForSeries))
            }
          })
          return quoteShallowEqual(prev, next) ? prev : next
        })
      },
    })
  }, [])

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true)
    setErr(null)
    const errs: string[] = []

    try {
      const q = await fetchCgSimpleQuote()
      if (seq !== loadSeq.current) return
      setQuote((prev) => {
        const merged = mergeCgQuoteWithMexc(q, prev, mexcLiveRef.current)
        return quoteShallowEqual(prev, merged) ? prev : merged
      })
      const t = Date.now()
      if (!mexcLiveRef.current) {
        setLiveSeries((prev) => mergeLiveSample(prev, t, q.usd))
        if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
          setLiveSeriesEur((prev) => mergeLiveSample(prev, t, q.eur!))
        }
      }
    } catch (e) {
      if (seq !== loadSeq.current) return
      errs.push(e instanceof Error ? e.message : String(e))
      setQuote(null)
    }

    if (seq === loadSeq.current) {
      setErr(formatCoinGeckoErrors(errs))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      queueMicrotask(() => {
        void load()
      })
    }, 500)
    return () => window.clearTimeout(handle)
  }, [load])

  useEffect(() => {
    let cancelled = false
    const days = marketChartDaysForTimeframe(tf)
    const key = `${days}:${chartCurrency}`
    const req = ++histReqId.current
    const prep = window.setTimeout(() => {
      if (cancelled) return
      setHistLoading(true)
      setHistErr(null)
    }, 0)
    const boot = window.setTimeout(() => {
      void fetchCgMarketChart(days, chartCurrency)
        .then((rows) => {
          if (cancelled || req !== histReqId.current) return
          setHistSeries(rows)
          setHistLoadedKey(key)
          setHistErr(null)
        })
        .catch((e) => {
          if (cancelled || req !== histReqId.current) return
          setHistSeries([])
          setHistLoadedKey(null)
          setHistErr(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          if (!cancelled && req === histReqId.current) setHistLoading(false)
        })
    }, 700)
    return () => {
      cancelled = true
      window.clearTimeout(prep)
      window.clearTimeout(boot)
    }
  }, [tf, chartCurrency])

  useEffect(() => {
    const flush = () => {
      if (document.hidden) return
      queueMicrotask(async () => {
        try {
          const q = await fetchCgSimpleQuote({ refresh: true })
          setQuote((prev) => {
            const merged = mergeCgQuoteWithMexc(q, prev, mexcLiveRef.current)
            return quoteShallowEqual(prev, merged) ? prev : merged
          })
          const t = Date.now()
          if (!mexcLiveRef.current) {
            setLiveSeries((prev) => mergeLiveSample(prev, t, q.usd))
            if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
              setLiveSeriesEur((prev) => mergeLiveSample(prev, t, q.eur!))
            }
          }
          setLiveErr(null)
        } catch {
          /* ignore */
        }
      })
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [])

  useEffect(() => {
    let cancelled = false

    const scheduleNext = (run: () => void, ms: number) => {
      window.clearTimeout(liveTimeoutRef.current)
      liveTimeoutRef.current = window.setTimeout(run, ms)
    }

    const tick = () => {
      if (cancelled) return
      if (document.hidden) {
        scheduleNext(() => {
          void tick()
        }, 45_000)
        return
      }

      const seq = ++liveSeq.current
      queueMicrotask(async () => {
        try {
          const q = await fetchCgSimpleQuote({ refresh: true })
          if (cancelled || seq !== liveSeq.current) return
          liveBackoffMsRef.current = LIVE_SPOT_INTERVAL_MS
          setQuote((prev) => {
            const merged = mergeCgQuoteWithMexc(q, prev, mexcLiveRef.current)
            return quoteShallowEqual(prev, merged) ? prev : merged
          })
          const t = Date.now()
          if (!mexcLiveRef.current) {
            setLiveSeries((prev) => mergeLiveSample(prev, t, q.usd))
            if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
              setLiveSeriesEur((prev) => mergeLiveSample(prev, t, q.eur!))
            }
          }
          setLiveErr(null)
        } catch (e) {
          if (cancelled || seq !== liveSeq.current) return
          const m = e instanceof Error ? e.message : String(e)
          const rateLimited = /429|limite de débit/i.test(m)
          const next = Math.min(Math.round(liveBackoffMsRef.current * 1.85), 120_000)
          liveBackoffMsRef.current = rateLimited ? Math.max(next, 45_000) : next
          setLiveErr(rateLimited ? null : m)
        }
        if (!cancelled) {
          scheduleNext(() => {
            void tick()
          }, liveBackoffMsRef.current)
        }
      })
    }

    liveTimeoutRef.current = window.setTimeout(() => {
      void tick()
    }, LIVE_SPOT_START_DELAY_MS)

    return () => {
      cancelled = true
      liveSeq.current += 1
      window.clearTimeout(liveTimeoutRef.current)
    }
  }, [])

  const tfScale = timeframeScale(tf)
  const tfOptions = TIMEFRAMES_BY_SCALE[tfScale]
  const spotSyncNow = useSpotSyncLiveClock(quote?.fetchedAt != null)

  return (
    <section className="dash-panel dash-panel--market" aria-labelledby="market-heading">
      <div className="chart-stack">
        <div className="chart-toolbar">
          <h2 id="market-heading" className="chart-toolbar__title">
            Prix RLS
          </h2>
          <div className="chart-toolbar__tf-rail" role="group" aria-label="Fenêtre d’affichage sur la série">
            <div className="chart-tf-segtrack" role="radiogroup" aria-label="Échelle du graphique">
              {TF_SCALE_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={tfScale === s}
                  title={TF_SCALE_UI[s].title}
                  className={`chart-tf-seg ${tfScale === s ? 'chart-tf-seg--on' : ''}`}
                  onClick={() => {
                    if (tfScale === s) return
                    setTf(TIMEFRAMES_BY_SCALE[s][0]!)
                  }}
                >
                  {TF_SCALE_UI[s].label}
                </button>
              ))}
            </div>
            <div className="chart-toolbar__tf-chips" role="radiogroup" aria-label="Durée affichée">
              {tfOptions.map((id) => {
                const meta = TIMEFRAME_BY_ID.get(id)!
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={tf === id}
                    title={meta.hint}
                    className={`chart-tf-chip ${tf === id ? 'chart-tf-chip--on' : ''}`}
                    onClick={() => setTf(id)}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
          <span className="chart-toolbar__rule" aria-hidden />
          <div
            className="chart-toolbar__ccy"
            role="radiogroup"
            aria-label="Devise du graphique"
          >
            <span className="chart-toolbar__ccy-key" id="ccy-label">
              Devise
            </span>
            {(['usd', 'eur'] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={chartCurrency === c}
                aria-labelledby="ccy-label"
                className={`chart-tool-btn chart-tool-btn--ccy ${chartCurrency === c ? 'chart-tool-btn--active' : ''}`}
                onClick={() => {
                  setChartCurrency(c)
                  if (c === 'eur' && quote?.eur != null && Number.isFinite(quote.eur)) {
                    setLiveSeriesEur((prev) =>
                      prev.length > 0 ? prev : mergeLiveSample([], Date.now(), quote.eur!),
                    )
                  }
                }}
              >
                {c === 'usd' ? 'USD' : 'EUR'}
              </button>
            ))}
          </div>
          {quote?.fetchedAt != null && (
            <span
              className="chart-toolbar__sync"
              title={
                (quote.usdSource ?? 'coingecko') === 'mexc'
                  ? `Flux spot MEXC (WebSocket, non affilié) — ${new Date(quote.fetchedAt).toISOString()}`
                  : `Réception CoinGecko simple/price — ${new Date(quote.fetchedAt).toISOString()} (âge mis à jour en direct)`
              }
            >
              <span className="chart-toolbar__sync-k">Dernière cotation spot</span>
              {(quote.usdSource ?? 'coingecko') === 'mexc' && (
                <span className="chart-toolbar__sync-src" title="Prix USD : carnet / trades publics MEXC">
                  {' '}
                  · MEXC
                </span>
              )}
              <span className="chart-toolbar__sync-time"> · {formatSpotWallTimeMs(quote.fetchedAt)}</span>
              <span className="chart-toolbar__sync-age">
                {' '}
                · maj il y a{' '}
                <span className="chart-toolbar__sync-age-val">{formatSpotAgeFr(spotSyncNow, quote.fetchedAt)}</span>
              </span>
              {mexcSpotStreamEnabled() && mexcStreamStatus !== 'open' && mexcStreamStatus !== 'idle' && (
                <span
                  className="chart-toolbar__sync-mexc"
                  title="État du flux WebSocket MEXC (spot public)"
                >
                  {' '}
                  ·{' '}
                  {mexcStreamStatus === 'connecting'
                    ? 'MEXC…'
                    : mexcStreamStatus === 'reconnecting'
                      ? 'MEXC reconnexion'
                      : mexcStreamStatus === 'error'
                        ? 'MEXC indisponible'
                        : ''}
                </span>
              )}
            </span>
          )}
        </div>

        {(err || histErr || liveErr) && (
          <div className="chart-stack__alerts">
            {err === MARKET_ERR_CG429 ? (
              <CoinGecko429Callout />
            ) : (
              err && <div className="dash-alert dash-alert--warn dash-alert--inline">{err}</div>
            )}
            {histErr && (
              <div className="dash-alert dash-alert--warn dash-alert--inline" role="status">
                Historique CoinGecko : {histErr} — repli sur le buffer live si présent. Vérifiez une clé demo (
                <code>VITE_COINGECKO_DEMO_API_KEY</code>) ou un proxy (<code>VITE_COINGECKO_API_ROOT</code>).
              </div>
            )}
            {liveErr && (
              <div className="dash-alert dash-alert--warn dash-alert--inline" role="status">
                Rafraîchissement spot : {liveErr}
              </div>
            )}
          </div>
        )}

        <MarketSpotViz
          tf={tf}
          chartCurrency={chartCurrency}
          quote={quote}
          liveSeries={liveSeries}
          liveSeriesEur={liveSeriesEur}
          histSeries={histSeries}
          histLoadedKey={histLoadedKey}
          loading={loading}
          histLoading={histLoading}
          err={err}
          histErr={histErr}
        />
      </div>

    </section>
  )
}
