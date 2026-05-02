/** Analyse quantitative fine à partir des points CoinGecko [ms, prix] (USD ou EUR selon la série affichée). */

export type MarketPrecisionAnalysis = {
  points: number
  windowMs: number
  windowHuman: string
  firstTs: number
  lastTs: number
  avgSampleStepMs: number
  minSampleStepMs: number
  maxSampleStepMs: number
  open: number
  close: number
  high: number
  low: number
  median: number
  meanPrice: number
  rangeUsd: number
  rangePctOfMid: number
  changePct: number
  /** Volatilité des rendements logarithmiques (approx. %). */
  volatilityLogPct: number
  /** Drawdown max depuis le plus haut courant sur la fenêtre (%). */
  maxDrawdownPct: number
  /** Écart absolu spot API vs dernier prix de série. */
  spotVsSeriesCloseUsd: number | null
  /** Écart relatif spot vs clôture série (%). */
  spotVsSeriesClosePct: number | null
}

function formatDurationFr(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rm = m % 60
  if (h < 48) return rm ? `${h} h ${rm} min` : `${h} h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d} j ${rh} h` : `${d} j`
}

/**
 * Métriques « chirurgicales » : pas de prédiction — statistiques descriptives sur la série affichée.
 */
export function analyzeMarketPrecision(
  prices: [number, number][],
  opts?: { spotCompare?: number | null },
): MarketPrecisionAnalysis | null {
  if (prices.length < 2) return null

  const sorted = [...prices].sort((a, b) => a[0] - b[0])
  const times = sorted.map((p) => p[0])
  const vals = sorted.map((p) => p[1])

  const firstTs = times[0]!
  const lastTs = times[times.length - 1]!
  const windowMs = lastTs - firstTs

  const steps: number[] = []
  for (let i = 1; i < times.length; i++) {
    steps.push(times[i]! - times[i - 1]!)
  }
  const avgSampleStepMs = steps.reduce((a, b) => a + b, 0) / steps.length
  const minSampleStepMs = Math.min(...steps)
  const maxSampleStepMs = Math.max(...steps)

  const open = vals[0]!
  const close = vals[vals.length - 1]!
  const sortedVals = [...vals].sort((a, b) => a - b)
  const midIdx = Math.floor((sortedVals.length - 1) / 2)
  const median =
    sortedVals.length % 2 === 1
      ? sortedVals[midIdx]!
      : (sortedVals[midIdx]! + sortedVals[midIdx + 1]!) / 2

  let sum = 0
  for (const v of vals) sum += v
  const meanPrice = sum / vals.length

  const high = Math.max(...vals)
  const low = Math.min(...vals)
  const rangeUsd = high - low
  const mid = (high + low) / 2
  const rangePctOfMid = mid !== 0 ? (rangeUsd / mid) * 100 : 0
  const changePct = open !== 0 ? ((close - open) / open) * 100 : 0

  const logReturns: number[] = []
  for (let i = 1; i < vals.length; i++) {
    const a = vals[i - 1]!
    const b = vals[i]!
    if (a > 0 && b > 0) logReturns.push(Math.log(b / a))
  }
  let volatilityLogPct = 0
  if (logReturns.length >= 2) {
    const m = logReturns.reduce((x, y) => x + y, 0) / logReturns.length
    const variance =
      logReturns.reduce((acc, x) => acc + (x - m) ** 2, 0) / (logReturns.length - 1)
    volatilityLogPct = Math.sqrt(variance) * 100
  }

  let peak = vals[0]!
  let maxDrawdownPct = 0
  for (const v of vals) {
    if (v > peak) peak = v
    const dd = peak !== 0 ? ((v - peak) / peak) * 100 : 0
    if (dd < maxDrawdownPct) maxDrawdownPct = dd
  }

  const spot = opts?.spotCompare
  let spotVsSeriesCloseUsd: number | null = null
  let spotVsSeriesClosePct: number | null = null
  if (typeof spot === 'number' && Number.isFinite(spot)) {
    spotVsSeriesCloseUsd = spot - close
    spotVsSeriesClosePct = close !== 0 ? ((spot - close) / close) * 100 : null
  }

  return {
    points: prices.length,
    windowMs,
    windowHuman: formatDurationFr(windowMs),
    firstTs,
    lastTs,
    avgSampleStepMs,
    minSampleStepMs,
    maxSampleStepMs,
    open,
    close,
    high,
    low,
    median,
    meanPrice,
    rangeUsd,
    rangePctOfMid,
    changePct,
    volatilityLogPct,
    maxDrawdownPct,
    spotVsSeriesCloseUsd,
    spotVsSeriesClosePct,
  }
}
