import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChartVsCurrency } from '../../raylsMarket'

type Props = {
  prices: [number, number][]
  /** Devise des valeurs `prices` (libellés axe / infobulle). */
  vsCurrency?: ChartVsCurrency
  /** `fr-FR` / `en-US`. */
  localeTag?: string
  ariaLabel?: string
  className?: string
}

const MAX_DRAW_POINTS = 720

/** Marges type appli mobile CoinGecko : libellés Y à gauche, temps en bas. */
const AXIS_LEFT = 52
const AXIS_BOTTOM = 26
const AXIS_TOP = 10
const AXIS_RIGHT = 10

function decimatePrices(pts: [number, number][], max: number): [number, number][] {
  if (pts.length <= max) return pts
  const out: [number, number][] = []
  const last = pts.length - 1
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i / (max - 1)) * last)
    out.push(pts[idx])
  }
  return out
}

function formatPriceFiat(n: number, loc: string) {
  return n.toLocaleString(loc, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
}

function fiatSymbol(vs: ChartVsCurrency): string {
  return vs === 'eur' ? '€' : '$'
}

/** Libellés axe Y proches CoinGecko (€ / $ avec décimales adaptées). */
function formatAxisPrice(n: number, loc: string): string {
  const a = Math.abs(n)
  if (a >= 1)
    return n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (a >= 0.01)
    return n.toLocaleString(loc, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  return n.toLocaleString(loc, { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

function formatAxisTime(ts: number, rangeMs: number, loc: string): string {
  const d = new Date(ts)
  if (rangeMs <= 48 * 60 * 60 * 1000) {
    return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (rangeMs <= 14 * 24 * 60 * 60 * 1000) {
    return d.toLocaleString(loc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
}

function yAxisBounds(loRaw: number, hiRaw: number): { lo: number; hi: number } {
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

function nicePriceTicks(lo: number, hi: number, count: number): number[] {
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

function timeAxisTicks(tMin: number, tMax: number, maxTicks = 7): number[] {
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

type Pt = { x: number; y: number }

/** Courbe lissée façon CoinGecko (splines de Bézier cubiques entre les points). */
function addSmoothCurvePath(ctx: CanvasRenderingContext2D, points: Pt[], closeBottom: boolean, chartBottom: number) {
  const n = points.length
  if (n < 2) return
  ctx.moveTo(points[0]!.x, points[0]!.y)
  if (n === 2) {
    ctx.lineTo(points[1]!.x, points[1]!.y)
    if (closeBottom) {
      const last = points[1]!
      const first = points[0]!
      ctx.lineTo(last.x, chartBottom)
      ctx.lineTo(first.x, chartBottom)
      ctx.closePath()
    }
    return
  }
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(n - 1, i + 2)]!
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
  if (closeBottom) {
    const last = points[n - 1]!
    const first = points[0]!
    ctx.lineTo(last.x, chartBottom)
    ctx.lineTo(first.x, chartBottom)
    ctx.closePath()
  }
}

/**
 * Courbe prix style CoinGecko : axes, temps, lissage, dégradé, point live en bout de courbe.
 */
export function PriceChartCanvas({
  prices,
  vsCurrency = 'usd',
  localeTag = 'fr-FR',
  ariaLabel,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pricesRef = useRef(prices)
  const vsRef = useRef(vsCurrency)
  const localeRef = useRef(localeTag)
  /** Index série pour la ligne hover — ref pour ne pas relancer l’effet canvas à chaque pixel. */
  const hoverIdxRef = useRef<number | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const pointerRafRef = useRef(0)
  const [hover, setHover] = useState<{ idx: number; clientX: number; clientY: number } | null>(null)

  const pickIndexFromMouseX = useCallback(
    (mx: number, chartLeft: number, chartW: number, series: [number, number][]) => {
      const n = series.length
      if (n < 1) return 0
      if (n === 1) return 0
      let tMin = Infinity
      let tMax = -Infinity
      for (const [t] of series) {
        if (t < tMin) tMin = t
        if (t > tMax) tMax = t
      }
      const span = Math.max(tMax - tMin, 1)
      const frac = (mx - chartLeft) / chartW
      const clamped = Math.max(0, Math.min(1, frac))
      const tTarget = tMin + clamped * span
      let best = 0
      let bestD = Infinity
      for (let i = 0; i < n; i++) {
        const d = Math.abs(series[i]![0] - tTarget)
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return best
    },
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let bufW = 0
    let bufH = 0
    let bufDpr = 0

    const draw = () => {
      const full = pricesRef.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 8 || h < 8) return

      if (w !== bufW || h !== bufH || dpr !== bufDpr) {
        bufW = w
        bufH = h
        bufDpr = dpr
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
      }

      if (full.length < 2) return

      let loRaw = Infinity
      let hiRaw = -Infinity
      for (const [, y] of full) {
        if (y < loRaw) loRaw = y
        if (y > hiRaw) hiRaw = y
      }
      const { lo, hi } = yAxisBounds(loRaw, hiRaw)
      const ySpan = Math.max(hi - lo, 1e-18)

      let tMin = Infinity
      let tMax = -Infinity
      for (const [t] of full) {
        if (t < tMin) tMin = t
        if (t > tMax) tMax = t
      }
      const tSpanMs = Math.max(tMax - tMin, 1)

      const chartLeft = AXIS_LEFT
      const chartRight = w - AXIS_RIGHT
      const chartTop = AXIS_TOP
      const chartBottom = h - AXIS_BOTTOM
      const chartW = chartRight - chartLeft
      const chartH = chartBottom - chartTop

      const nxTime = (ts: number) => chartLeft + ((ts - tMin) / tSpanMs) * chartW
      const ny = (v: number) => chartTop + (1 - (v - lo) / ySpan) * chartH

      const pts = decimatePrices(full, MAX_DRAW_POINTS)
      const pathPts: Pt[] = pts.map((p) => ({ x: nxTime(p[0]), y: ny(p[1]) }))

      const yTicks = nicePriceTicks(lo, hi, 5)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      for (const v of yTicks) {
        const yg = ny(v)
        ctx.beginPath()
        ctx.moveTo(chartLeft, yg)
        ctx.lineTo(chartRight, yg)
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(148, 163, 184, 0.72)'
      ctx.font = '11px ui-monospace, SF Mono, Menlo, monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (const v of yTicks) {
        const yg = ny(v)
        if (yg >= chartTop - 2 && yg <= chartBottom + 2) {
          ctx.fillText(formatAxisPrice(v, localeRef.current), chartLeft - 8, yg)
        }
      }

      const xTicks = timeAxisTicks(tMin, tMax, 7)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (const ts of xTicks) {
        const xg = nxTime(ts)
        if (xg >= chartLeft - 1 && xg <= chartRight + 1) {
          ctx.fillText(formatAxisTime(ts, tSpanMs, localeRef.current), xg, chartBottom + 6)
        }
      }

      const g = ctx.createLinearGradient(chartLeft, chartTop, chartRight, chartBottom)
      g.addColorStop(0, 'rgba(74, 222, 128, 0.22)')
      g.addColorStop(0.45, 'rgba(34, 197, 94, 0.1)')
      g.addColorStop(1, 'rgba(43, 107, 212, 0.04)')
      ctx.fillStyle = g
      ctx.beginPath()
      addSmoothCurvePath(ctx, pathPts, true, chartBottom)
      ctx.fill()

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.98)'
      ctx.lineWidth = 2.25
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(74, 222, 128, 0.35)'
      ctx.shadowBlur = 6
      ctx.beginPath()
      addSmoothCurvePath(ctx, pathPts, false, chartBottom)
      ctx.stroke()
      ctx.shadowBlur = 0

      const last = full[full.length - 1]!
      const lx = nxTime(last[0])
      const ly = ny(last[1])
      const sym = fiatSymbol(vsRef.current)
      const loc = localeRef.current
      const label =
        vsRef.current === 'eur'
          ? `${formatAxisPrice(last[1], loc)} ${sym}`
          : `${sym}${formatAxisPrice(last[1], loc)}`

      ctx.save()
      ctx.fillStyle = 'rgba(74, 222, 128, 0.45)'
      ctx.beginPath()
      ctx.arc(lx, ly, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(74, 222, 128, 1)'
      ctx.strokeStyle = 'rgba(15, 24, 40, 0.95)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(lx, ly, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.font = '600 11px system-ui, sans-serif'
      const padX = 8
      const tw = ctx.measureText(label).width
      const boxW = tw + padX * 2
      const boxH = 22
      let bx = lx + 10
      if (bx + boxW > chartRight - 4) bx = lx - boxW - 10
      if (bx < chartLeft + 4) bx = Math.min(chartRight - boxW - 4, lx + 10)
      let by = ly - boxH / 2
      by = Math.max(chartTop + 2, Math.min(by, chartBottom - boxH - 2))

      ctx.fillStyle = 'rgba(16, 24, 40, 0.92)'
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)'
      ctx.lineWidth = 1
      const r = 6
      ctx.beginPath()
      ctx.roundRect(bx, by, boxW, boxH, r)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#86efac'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, bx + padX, by + boxH / 2)
      ctx.restore()

      const hIdx = hoverIdxRef.current
      if (hIdx != null && hIdx >= 0 && hIdx < full.length) {
        const hx = nxTime(full[hIdx]![0])
        const hy = ny(full[hIdx]![1])

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(hx, chartTop)
        ctx.lineTo(hx, chartBottom)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = 'rgba(74, 222, 128, 0.95)'
        ctx.strokeStyle = 'rgba(15, 24, 40, 0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(hx, hy, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }

    drawRef.current = draw
    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(canvas)
    return () => {
      drawRef.current = () => {}
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = 0
      ro.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    pricesRef.current = prices
    hoverIdxRef.current = null
    queueMicrotask(() => setHover(null))
    drawRef.current()
  }, [prices])

  useLayoutEffect(() => {
    vsRef.current = vsCurrency
    drawRef.current()
  }, [vsCurrency])

  useLayoutEffect(() => {
    localeRef.current = localeTag
    drawRef.current()
  }, [localeTag])

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cancelAnimationFrame(pointerRafRef.current)
    pointerRafRef.current = requestAnimationFrame(() => {
      pointerRafRef.current = 0
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const chartLeft = AXIS_LEFT
      const chartRight = w - AXIS_RIGHT
      const chartTop = AXIS_TOP
      const chartBottom = h - AXIS_BOTTOM
      const chartW = chartRight - chartLeft
      const full = pricesRef.current
      if (full.length < 2 || w < 16) {
        hoverIdxRef.current = null
        setHover(null)
        drawRef.current()
        return
      }
      if (mx < chartLeft - 4 || mx > chartRight + 4 || my < chartTop - 4 || my > chartBottom + 4) {
        hoverIdxRef.current = null
        setHover(null)
        drawRef.current()
        return
      }
      const idx = pickIndexFromMouseX(mx, chartLeft, chartW, full)
      hoverIdxRef.current = idx
      setHover({ idx, clientX: e.clientX, clientY: e.clientY })
      drawRef.current()
    })
  }

  const onPointerLeave = () => {
    cancelAnimationFrame(pointerRafRef.current)
    pointerRafRef.current = 0
    hoverIdxRef.current = null
    setHover(null)
    drawRef.current()
  }

  const hoverPoint =
    hover != null && prices.length > 0 && hover.idx >= 0 && hover.idx < prices.length
      ? prices[hover.idx]
      : null

  return (
    <div className="price-chart-shell price-chart-shell--cg">
      <canvas
        ref={canvasRef}
        className={className ?? 'price-canvas'}
        role="img"
        aria-label={ariaLabel ?? (vsCurrency === 'eur' ? 'Courbe de prix en euros' : 'Courbe de prix en dollars')}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ cursor: 'crosshair', touchAction: 'none' }}
      />
      {hoverPoint && hover != null && (
        <div
          className="price-chart-tooltip"
          style={{
            left: hover.clientX,
            top: hover.clientY,
          }}
        >
          <div className="price-chart-tooltip-price">
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverPoint[1], localeTag)} €`
              : `$${formatPriceFiat(hoverPoint[1], localeTag)}`}
          </div>
          <div className="price-chart-tooltip-time">
            {new Date(hoverPoint[0]).toLocaleString(localeTag, {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  )
}
