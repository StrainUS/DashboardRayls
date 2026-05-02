/** Marges communes courbes / bougies (style proche CoinGecko). */
export const CHART_AXIS_LEFT = 52
export const CHART_AXIS_BOTTOM = 26
export const CHART_AXIS_TOP = 10
export const CHART_AXIS_RIGHT = 10

export function formatPriceFiat(n: number, loc: string) {
  return n.toLocaleString(loc, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
}

export function formatAxisPrice(n: number, loc: string): string {
  const a = Math.abs(n)
  if (a >= 1)
    return n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (a >= 0.01)
    return n.toLocaleString(loc, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  return n.toLocaleString(loc, { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

export function formatAxisTime(ts: number, rangeMs: number, loc: string): string {
  const d = new Date(ts)
  if (rangeMs <= 48 * 60 * 60 * 1000) {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (rangeMs <= 14 * 24 * 60 * 60 * 1000) {
    return d.toLocaleString(loc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
}

export function yAxisBounds(loRaw: number, hiRaw: number): { lo: number; hi: number } {
  let lo = loRaw
  let hi = hiRaw
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1 }
  if (hi < lo) [lo, hi] = [hi, lo]
  let span = hi - lo
  const mid = (hi + lo) / 2
  const minRelSpan = Math.max(Math.abs(mid) * 0.0012, 1e-12)
  if (span < minRelSpan) {
    const extra = (minRelSpan - span) / 2
    lo -= extra
    hi += extra
    span = minRelSpan
  }
  const margin = span * 0.08
  return { lo: lo - margin, hi: hi + margin }
}

export function nicePriceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo
  if (span <= 0) return [lo]
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(lo + (span * i) / (count - 1))
  }
  return out
}

function niceTimeStepMs(spanMs: number, maxTicks = 6): number {
  const target = spanMs / Math.max(maxTicks, 1)
  const steps = [
    60_000,
    2 * 60_000,
    5 * 60_000,
    10 * 60_000,
    15 * 60_000,
    20 * 60_000,
    30 * 60_000,
    3600_000,
    2 * 3600_000,
    3 * 3600_000,
    4 * 3600_000,
    6 * 3600_000,
    12 * 3600_000,
    24 * 3600_000,
    2 * 24 * 3600_000,
    7 * 24 * 3600_000,
  ]
  for (const s of steps) {
    if (s >= target * 0.75) return s
  }
  return steps[steps.length - 1]!
}

export function timeAxisTicks(tMin: number, tMax: number, maxTicks = 7): number[] {
  const span = Math.max(tMax - tMin, 1)
  const step = niceTimeStepMs(span, maxTicks)
  let t = Math.ceil(tMin / step) * step
  const out: number[] = []
  let guard = 0
  while (t <= tMax + step * 0.01 && guard++ < 32) {
    if (t >= tMin - 1) out.push(t)
    t += step
  }
  if (out.length === 0) return [tMin, (tMin + tMax) / 2, tMax]
  return out
}
