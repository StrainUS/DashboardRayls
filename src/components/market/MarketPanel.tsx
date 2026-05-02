import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type TimeframeId,
  type ChartVsCurrency,
  type MarketTrend,
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
import { useI18n } from '../../i18n'
import type { Locale } from '../../i18n/types'
import { localeTag } from '../../i18n/translate'
import { PriceChartCanvas } from './PriceChartCanvas'

type TFn = (key: string, vars?: Record<string, string | number>) => string

/** Buffer spot : rétention max + plafond de points + fusion si deux cotations très proches. */
function mergeLiveSample(series: [number, number][], ts: number, usd: number): [number, number][] {
  const now = Date.now()
  const cut = now - LIVE_BUFFER_MAX_MS
  let next = series.filter(([t0]) => t0 >= cut)
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

function liveWindowLabelTf(tf: TimeframeId, t: TFn): string {
  const ms = timeframeLiveDisplayWindowMs(tf)
  const mins = Math.round(ms / 60_000)
  if (mins < 240) return t('market.liveWindowMin', { n: mins })
  const days = ms / (24 * 60 * 60 * 1000)
  if (days < 14) return t('market.liveWindowDaysShort', { n: Math.round(days * 10) / 10 })
  return t('market.liveWindowDays', { n: Math.round(days) })
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

const TF_SCALE_I18N: Record<TimeframeScale, { labelKey: string; titleKey: string }> = {
  min: { labelKey: 'market.scaleMin', titleKey: 'market.scaleMinTitle' },
  h: { labelKey: 'market.scaleH', titleKey: 'market.scaleHTitle' },
  d: { labelKey: 'market.scaleD', titleKey: 'market.scaleDTitle' },
}

function timeframeScale(tf: TimeframeId): TimeframeScale {
  if (tf === '1m' || tf === '5m' || tf === '15m' || tf === '30m') return 'min'
  if (tf === '1h' || tf === '24h') return 'h'
  return 'd'
}

/** Valeur sentinelle : l’UI affiche un encart structuré plutôt qu’un long paragraphe. */
const MARKET_ERR_CG429 = '\u200BCG429\u200B'

const RATE_LIMIT_RGX = /429|limite de débit|rate limit|too many requests/i

function formatCoinGeckoErrors(messages: string[]): string | null {
  if (messages.length === 0) return null
  const uniq = [...new Set(messages)]
  const allRateLimited = uniq.every((m) => RATE_LIMIT_RGX.test(m))
  if (allRateLimited) return MARKET_ERR_CG429
  return uniq.join(' · ')
}

function CoinGecko429Callout() {
  const { t } = useI18n()
  return (
    <div
      className="dash-alert dash-alert--warn dash-alert--inline dash-alert--cg429"
      role="status"
    >
      <p className="dash-alert__title">{t('market.cg429Title')}</p>
      <p className="dash-alert__text">{t('market.cg429Text')}</p>
      <ul className="dash-alert__list">
        <li>{t('market.cg429Local')}</li>
        <li>{t('market.cg429Prod')}</li>
      </ul>
    </div>
  )
}

const SPOT_SYNC_TICK_MS = 1000

/** Horloge locale pour faire défiler l’âge « maj il y a … » en quasi temps réel (pause si onglet masqué). */
function useSpotSyncLiveClock(active: boolean): number {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    let id: number | undefined
    const start = () => {
      id = window.setInterval(() => setTick(Date.now()), SPOT_SYNC_TICK_MS)
    }
    const stop = () => {
      if (id !== undefined) window.clearInterval(id)
      id = undefined
    }
    const onVis = () => {
      setTick(Date.now())
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
  return tick
}

function formatSpotWallTimeMs(ts: number, loc: string): string {
  return new Date(ts).toLocaleTimeString(loc, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  })
}

function formatSpotAge(nowMs: number, fetchedAt: number, locale: Locale): string {
  const ms = Math.max(0, nowMs - fetchedAt)
  const sec = ms / 1000
  const dec = locale === 'fr' ? ',' : '.'
  const fmt = (n: string) => n.replace('.', dec)
  if (sec < 60) return `${fmt(sec.toFixed(2))} s`
  if (sec < 3600) return `${fmt((sec / 60).toFixed(1))} min`
  return `${fmt((sec / 3600).toFixed(2))} h`
}

function trendLabel(tr: MarketTrend, t: TFn): string {
  if (tr === 'hausse') return t('market.trendUp')
  if (tr === 'baisse') return t('market.trendDown')
  return t('market.trendFlat')
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
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
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
      const filtered = histSeries.filter(([t0]) => t0 >= cut)
      base =
        filtered.length >= 2
          ? filtered
          : histSeries.slice(-Math.min(2000, histSeries.length))
    } else {
      if (liveBuf.length === 0) return []
      const lastT = liveBuf[liveBuf.length - 1]![0]
      base = liveBuf.filter(([t0]) => t0 >= Math.max(cut, lastT - w))
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
      const [t0, y] = merged[0]!
      const dt = Math.max(1_000, Math.min(120_000, (now - t0) * 0.02 + 5_000))
      merged = ensureTimeSorted([
        [Math.min(t0, now) - dt, y],
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
  const tfLabel = t(`market.tf.${tf}.label`)
  const liveBufLen = (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length
  const errBlocksChart = err != null && err !== MARKET_ERR_CG429
  const chartLoading =
    !displaySnap &&
    (loading || histLoading) &&
    !errBlocksChart &&
    !histErr &&
    quote == null &&
    liveBufLen === 0
  const windowLbl = liveWindowLabelTf(tf, t)
  const secSpot = Math.ceil(LIVE_SPOT_INTERVAL_MS / 1000)

  return (
    <>
      <div className="market-spot-strip" aria-label={t('market.spotStripAria')}>
        <div className="stat-block stat-block--strip">
          <div className="label">{t('market.priceUsd')}</div>
          <div className="value price-val price-val--strip">
            {quote
              ? `$${quote.usd.toLocaleString(loc, { minimumFractionDigits: 8, maximumFractionDigits: 10 })}`
              : loading
                ? '…'
                : '—'}
          </div>
          {quote?.usd24hChange != null && (
            <div className={`delta delta--strip ${quote.usd24hChange >= 0 ? 'delta--up' : 'delta--down'}`}>
              {t('market.h24')} {quote.usd24hChange >= 0 ? '+' : ''}
              {quote.usd24hChange.toFixed(2)} %
            </div>
          )}
        </div>
        <div className="stat-block stat-block--strip">
          <div className="label">{t('market.priceEur')}</div>
          <div className="value price-val price-val--strip">
            {quote?.eur != null && Number.isFinite(quote.eur)
              ? `${quote.eur.toLocaleString(loc, { minimumFractionDigits: 8, maximumFractionDigits: 10 })} €`
              : loading
                ? '…'
                : '—'}
          </div>
          {quote?.eur24hChange != null && (
            <div className={`delta delta--strip ${quote.eur24hChange >= 0 ? 'delta--up' : 'delta--down'}`}>
              {t('market.h24')} {quote.eur24hChange >= 0 ? '+' : ''}
              {quote.eur24hChange.toFixed(2)} %
            </div>
          )}
        </div>
        <div className="stat-block stat-block--strip trend-block">
          <div className="label">
            {t('market.trend', { tf: tfLabel, ccy: chartCurrency.toUpperCase() })}
          </div>
          {analysis ? (
            <>
              <div className={`trend-badge trend-badge--strip trend--${analysis.trend}`}>
                {trendLabel(analysis.trend, t)}
              </div>
              <div className="sub sub--strip">
                {analysis.changePct >= 0 ? '+' : ''}
                {analysis.changePct.toFixed(2)} % · {analysis.points} {t('market.pts')}
              </div>
            </>
          ) : (
            <div className="sub sub--strip">—</div>
          )}
        </div>
      </div>
      <div className="chart-wrap chart-wrap--tall chart-wrap--hero chart-wrap--in-stack">
        {displaySnap && displaySnap.prices.length > 1 ? (
          <PriceChartCanvas
            key={`${tf}-${chartCurrency}`}
            vsCurrency={chartCurrency}
            prices={displaySnap.prices}
            localeTag={loc}
            ariaLabel={chartCurrency === 'eur' ? t('market.chartAriaEur') : t('market.chartAriaUsd')}
          />
        ) : (
          <div className="chart-placeholder">
            {chartLoading
              ? t('market.loadingChart')
              : displayPrices.length < 2
                ? histErr && (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length < 2
                  ? t('market.noData')
                  : (chartCurrency === 'eur' ? liveSeriesEur : liveSeries).length < 2 && !histLoading
                    ? t('market.waitingData', { sec: secSpot })
                    : t('market.notEnoughWindow', { window: windowLbl })
                : err && !quote
                  ? '—'
                  : t('market.notEnoughPts')}
          </div>
        )}
      </div>
    </>
  )
}

export function MarketPanel() {
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
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
      const t0 = Date.now()
      if (!mexcLiveRef.current) {
        setLiveSeries((prev) => mergeLiveSample(prev, t0, q.usd))
        if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
          setLiveSeriesEur((prev) => mergeLiveSample(prev, t0, q.eur!))
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
          const t0 = Date.now()
          if (!mexcLiveRef.current) {
            setLiveSeries((prev) => mergeLiveSample(prev, t0, q.usd))
            if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
              setLiveSeriesEur((prev) => mergeLiveSample(prev, t0, q.eur!))
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
          const t0 = Date.now()
          if (!mexcLiveRef.current) {
            setLiveSeries((prev) => mergeLiveSample(prev, t0, q.usd))
            if (chartCcyRef.current === 'eur' && q.eur != null && Number.isFinite(q.eur)) {
              setLiveSeriesEur((prev) => mergeLiveSample(prev, t0, q.eur!))
            }
          }
          setLiveErr(null)
        } catch (e) {
          if (cancelled || seq !== liveSeq.current) return
          const m = e instanceof Error ? e.message : String(e)
          const rateLimited = RATE_LIMIT_RGX.test(m)
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
            {t('market.title')}
          </h2>
          <div className="chart-toolbar__tf-rail" role="group" aria-label={t('market.windowAria')}>
            <div className="chart-tf-segtrack" role="radiogroup" aria-label={t('market.scaleAria')}>
              {TF_SCALE_ORDER.map((s) => {
                const keys = TF_SCALE_I18N[s]
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={tfScale === s}
                    title={t(keys.titleKey)}
                    className={`chart-tf-seg ${tfScale === s ? 'chart-tf-seg--on' : ''}`}
                    onClick={() => {
                      if (tfScale === s) return
                      setTf(TIMEFRAMES_BY_SCALE[s][0]!)
                    }}
                  >
                    {t(keys.labelKey)}
                  </button>
                )
              })}
            </div>
            <div className="chart-toolbar__tf-chips" role="radiogroup" aria-label={t('market.durationAria')}>
              {tfOptions.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={tf === id}
                  title={t(`market.tf.${id}.hint`)}
                  className={`chart-tf-chip ${tf === id ? 'chart-tf-chip--on' : ''}`}
                  onClick={() => setTf(id)}
                >
                  {t(`market.tf.${id}.label`)}
                </button>
              ))}
            </div>
          </div>
          <span className="chart-toolbar__rule" aria-hidden />
          <div
            className="chart-toolbar__ccy"
            role="radiogroup"
            aria-label={t('market.ccyAria')}
          >
            <span className="chart-toolbar__ccy-key" id="ccy-label">
              {t('market.ccyLabel')}
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
                  ? t('market.titleMexcStream', { iso: new Date(quote.fetchedAt).toISOString() })
                  : t('market.titleCgStream', { iso: new Date(quote.fetchedAt).toISOString() })
              }
            >
              <span className="chart-toolbar__sync-k">{t('market.lastQuote')}</span>
              {(quote.usdSource ?? 'coingecko') === 'mexc' && (
                <span className="chart-toolbar__sync-src" title={t('market.srcMexcTitle')}>
                  {t('market.mexcSuffix')}
                </span>
              )}
              <span className="chart-toolbar__sync-time"> · {formatSpotWallTimeMs(quote.fetchedAt, loc)}</span>
              <span className="chart-toolbar__sync-age">
                {t('market.updatedAgo')}{' '}
                <span className="chart-toolbar__sync-age-val">{formatSpotAge(spotSyncNow, quote.fetchedAt, locale)}</span>
              </span>
              {mexcSpotStreamEnabled() && mexcStreamStatus !== 'open' && mexcStreamStatus !== 'idle' && (
                <span
                  className="chart-toolbar__sync-mexc"
                  title={t('market.titleMexcWs')}
                >
                  {' '}
                  ·{' '}
                  {mexcStreamStatus === 'connecting'
                    ? t('market.mexcConnecting')
                    : mexcStreamStatus === 'reconnecting'
                      ? t('market.mexcReconnect')
                      : mexcStreamStatus === 'error'
                        ? t('market.mexcErr')
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
                {t('market.histErr', { msg: histErr })}
              </div>
            )}
            {liveErr && (
              <div className="dash-alert dash-alert--warn dash-alert--inline" role="status">
                {t('market.liveErr', { msg: liveErr })}
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
