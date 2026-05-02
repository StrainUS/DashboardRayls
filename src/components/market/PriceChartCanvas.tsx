import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type ChartVsCurrency, liveMarkerSentiment } from '../../raylsMarket'
import {
  CHART_AXIS_BOTTOM,
  CHART_AXIS_LEFT,
  CHART_AXIS_RIGHT,
  CHART_AXIS_TOP,
  formatAxisPrice,
  formatAxisTime,
  formatPriceFiat,
  nicePriceTicks,
  timeAxisTicks,
  yAxisBounds,
} from './chartAxis'
import { drawLiveQuoteMarker } from './liveQuoteMarker'
import { getChartTooltipFixedPosition } from './chartTooltipPosition'

type Props = {
  prices: [number, number][]
  /** Devise des valeurs `prices` (libellés axe / infobulle). */
  vsCurrency?: ChartVsCurrency
  /** `fr-FR` / `en-US`. */
  localeTag?: string
  ariaLabel?: string
  className?: string
  /** Fenêtre timeframe (`timeframeLiveDisplayWindowMs`) : teinte du point live = même logique que le badge tendance. */
  liveSentimentNominalMs?: number
}

const MAX_DRAW_POINTS = 720

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

type Pt = { x: number; y: number }

/**
 * Prix interpolé à un instant `t` (série triée par temps). Permet de suivre la courbe en glissant la souris
 * sans sauter d’échantillon à l’échantillon.
 */
function interpolateSeriesAtTime(series: [number, number][], t: number): { t: number; price: number } {
  const n = series.length
  if (n === 0) return { t, price: NaN }
  if (n === 1) {
    const p = series[0]!
    return { t: p[0], price: p[1] }
  }
  const first = series[0]!
  const last = series[n - 1]!
  if (t <= first[0]) return { t: first[0], price: first[1] }
  if (t >= last[0]) return { t: last[0], price: last[1] }
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (series[mid]![0] <= t) lo = mid
    else hi = mid
  }
  const [t0, p0] = series[lo]!
  const [t1, p1] = series[hi]!
  if (t1 <= t0) return { t, price: p0 }
  const w = (t - t0) / (t1 - t0)
  return { t, price: p0 + w * (p1 - p0) }
}

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
  liveSentimentNominalMs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pricesRef = useRef(prices)
  const vsRef = useRef(vsCurrency)
  const localeRef = useRef(localeTag)
  const liveNominalRef = useRef<number | undefined>(liveSentimentNominalMs)
  /**
   * Fraction 0–1 sur la zone graphique (temps) : stable quand la fenêtre glisse en live ;
   * le prix affiché est réinterpolé à chaque frame à partir de la série courante.
   */
  const scrubFracRef = useRef<number | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const pointerRafRef = useRef(0)
  const [hover, setHover] = useState<{
    frac: number
    clientX: number
    clientY: number
  } | null>(null)

  const timeAtFrac = useCallback((series: [number, number][], frac: number) => {
    let tMin = Infinity
    let tMax = -Infinity
    for (const [t] of series) {
      if (t < tMin) tMin = t
      if (t > tMax) tMax = t
    }
    const span = Math.max(tMax - tMin, 1)
    return tMin + Math.max(0, Math.min(1, frac)) * span
  }, [])

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
      try {
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

        const chartLeft = CHART_AXIS_LEFT
        const chartRight = w - CHART_AXIS_RIGHT
        const chartTop = CHART_AXIS_TOP
        const chartBottom = h - CHART_AXIS_BOTTOM
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
        const sentiment = liveMarkerSentiment(full, liveNominalRef.current)
        drawLiveQuoteMarker(ctx, lx, ly, { nowMs: performance.now(), sentiment })

        const sf = scrubFracRef.current
        if (sf != null && full.length >= 2) {
          const f = Math.max(0, Math.min(1, sf))
          const tSel = tMin + f * tSpanMs
          const { price: scrubPrice } = interpolateSeriesAtTime(full, tSel)
          if (Number.isFinite(scrubPrice)) {
            const hx = nxTime(tSel)
            const hy = ny(scrubPrice)

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(hx, chartTop)
            ctx.lineTo(hx, chartBottom)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(chartLeft, hy)
            ctx.lineTo(chartRight, hy)
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
      } finally {
        if (!document.hidden) {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(draw)
        } else {
          raf = 0
        }
      }
    }

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (raf === 0) {
        raf = requestAnimationFrame(draw)
      }
    }

    drawRef.current = draw
    raf = requestAnimationFrame(draw)
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(() => drawRef.current())
    ro.observe(canvas)
    return () => {
      drawRef.current = () => {}
      document.removeEventListener('visibilitychange', onVis)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = 0
      scrubFracRef.current = null
      ro.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    pricesRef.current = prices
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

  useLayoutEffect(() => {
    liveNominalRef.current = liveSentimentNominalMs
    drawRef.current()
  }, [liveSentimentNominalMs])

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
      const chartLeft = CHART_AXIS_LEFT
      const chartRight = w - CHART_AXIS_RIGHT
      const chartTop = CHART_AXIS_TOP
      const chartBottom = h - CHART_AXIS_BOTTOM
      const chartW = chartRight - chartLeft
      const full = pricesRef.current
      if (full.length < 2 || w < 16) {
        scrubFracRef.current = null
        setHover(null)
        drawRef.current()
        return
      }
      if (mx < chartLeft - 4 || mx > chartRight + 4 || my < chartTop - 4 || my > chartBottom + 4) {
        scrubFracRef.current = null
        setHover(null)
        drawRef.current()
        return
      }
      const frac = (mx - chartLeft) / chartW
      const clamped = Math.max(0, Math.min(1, frac))
      scrubFracRef.current = clamped
      setHover({ frac: clamped, clientX: e.clientX, clientY: e.clientY })
      drawRef.current()
    })
  }

  const onPointerLeave = () => {
    cancelAnimationFrame(pointerRafRef.current)
    pointerRafRef.current = 0
    scrubFracRef.current = null
    setHover(null)
    drawRef.current()
  }

  const hoverSample =
    hover != null && prices.length >= 2
      ? interpolateSeriesAtTime(prices, timeAtFrac(prices, hover.frac))
      : null

  const tooltipPos =
    hoverSample != null && hover != null && Number.isFinite(hoverSample.price)
      ? getChartTooltipFixedPosition(hover.clientX, hover.clientY)
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
        onPointerDown={(e) => {
          if (e.button === 0) e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            /* not captured */
          }
        }}
        onPointerCancel={onPointerLeave}
        style={{ cursor: 'crosshair' }}
      />
      {tooltipPos && hoverSample && (
        <div
          className={`price-chart-tooltip${tooltipPos.flipBelow ? ' price-chart-tooltip--below' : ''}`}
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
          }}
        >
          <div className="price-chart-tooltip-price">
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverSample.price, localeTag)} €`
              : `$${formatPriceFiat(hoverSample.price, localeTag)}`}
          </div>
          <div className="price-chart-tooltip-time">
            {new Date(hoverSample.t).toLocaleString(localeTag, {
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
