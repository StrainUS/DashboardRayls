import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type ChartVsCurrency, type OhlcCandle } from '../../raylsMarket'
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

type Props = {
  candles: OhlcCandle[]
  vsCurrency?: ChartVsCurrency
  localeTag?: string
  ariaLabel?: string
  className?: string
}

const GREEN = 'rgba(34, 197, 94, 0.92)'
const GREEN_DIM = 'rgba(34, 197, 94, 0.55)'
const RED = 'rgba(239, 68, 68, 0.92)'
const RED_DIM = 'rgba(239, 68, 68, 0.55)'

function candleBodyWidth(
  nxTime: (ts: number) => number,
  arr: OhlcCandle[],
  i: number,
  chartLeft: number,
  chartRight: number,
): number {
  const n = arr.length
  const x = nxTime(arr[i]!.t)
  if (n === 1) return Math.min(10, (chartRight - chartLeft) * 0.04)
  let gapL = x - chartLeft
  let gapR = chartRight - x
  if (i > 0) gapL = Math.min(gapL, x - nxTime(arr[i - 1]!.t))
  if (i < n - 1) gapR = Math.min(gapR, nxTime(arr[i + 1]!.t) - x)
  const base = Math.min(gapL, gapR) * 0.75
  return Math.max(2, Math.min(14, base))
}

export function CandleChartCanvas({
  candles,
  vsCurrency = 'usd',
  localeTag = 'fr-FR',
  ariaLabel,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const candlesRef = useRef(candles)
  const vsRef = useRef(vsCurrency)
  const localeRef = useRef(localeTag)
  const scrubFracRef = useRef<number | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const pointerRafRef = useRef(0)
  const [hover, setHover] = useState<{
    frac: number
    clientX: number
    clientY: number
  } | null>(null)

  const timeAtFrac = useCallback((arr: OhlcCandle[], frac: number) => {
    let tMin = Infinity
    let tMax = -Infinity
    for (const c of arr) {
      if (c.t < tMin) tMin = c.t
      if (c.t > tMax) tMax = c.t
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
        const arr = candlesRef.current
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

        if (arr.length < 1) return

        let loRaw = Infinity
        let hiRaw = -Infinity
        for (const c of arr) {
          if (c.l < loRaw) loRaw = c.l
          if (c.h > hiRaw) hiRaw = c.h
        }
        const { lo, hi } = yAxisBounds(loRaw, hiRaw)
        const ySpan = Math.max(hi - lo, 1e-18)

        let tMin = Infinity
        let tMax = -Infinity
        for (const c of arr) {
          if (c.t < tMin) tMin = c.t
          if (c.t > tMax) tMax = c.t
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

        for (let i = 0; i < arr.length; i++) {
          const c = arr[i]!
          const x = nxTime(c.t)
          const yO = ny(c.o)
          const yC = ny(c.c)
          const yHi = ny(c.h)
          const yLo = ny(c.l)
          const up = c.c >= c.o
          const stroke = up ? GREEN : RED
          const fill = up ? GREEN_DIM : RED_DIM
          const top = Math.min(yO, yC)
          const bot = Math.max(yO, yC)
          const bw = candleBodyWidth(nxTime, arr, i, chartLeft, chartRight)

          ctx.strokeStyle = stroke
          ctx.lineWidth = 1.25
          ctx.beginPath()
          ctx.moveTo(x, yHi)
          ctx.lineTo(x, yLo)
          ctx.stroke()

          const bodyH = Math.max(bot - top, 1)
          ctx.fillStyle = fill
          ctx.strokeStyle = stroke
          ctx.lineWidth = 1.1
          ctx.beginPath()
          ctx.rect(x - bw / 2, top, bw, bodyH)
          ctx.fill()
          ctx.stroke()
        }

        const last = arr[arr.length - 1]!
        const lx = nxTime(last.t)
        const ly = ny(last.c)
        const sentiment = last.c >= last.o ? 'bullish' : 'bearish'
        drawLiveQuoteMarker(ctx, lx, ly, { nowMs: performance.now(), sentiment })

        const sf = scrubFracRef.current
        if (sf != null && arr.length >= 1) {
          const f = Math.max(0, Math.min(1, sf))
          const tSel = tMin + f * tSpanMs
          let best = 0
          let bestD = Infinity
          for (let i = 0; i < arr.length; i++) {
            const d = Math.abs(arr[i]!.t - tSel)
            if (d < bestD) {
              bestD = d
              best = i
            }
          }
          const sel = arr[best]!
          const hx = nxTime(sel.t)
          const hy = ny(sel.c)

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

          ctx.fillStyle = 'rgba(148, 163, 184, 0.95)'
          ctx.strokeStyle = 'rgba(15, 24, 40, 0.9)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(hx, hy, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
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
    candlesRef.current = candles
    drawRef.current()
  }, [candles])

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
      const chartLeft = CHART_AXIS_LEFT
      const chartRight = w - CHART_AXIS_RIGHT
      const chartTop = CHART_AXIS_TOP
      const chartBottom = h - CHART_AXIS_BOTTOM
      const chartW = chartRight - chartLeft
      const arr = candlesRef.current
      if (arr.length < 1 || w < 16) {
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

  const hoverCandle =
    hover != null && candles.length >= 1
      ? (() => {
          const tSel = timeAtFrac(candles, hover.frac)
          let best = candles[0]!
          let bestD = Infinity
          for (const c of candles) {
            const d = Math.abs(c.t - tSel)
            if (d < bestD) {
              bestD = d
              best = c
            }
          }
          return best
        })()
      : null

  return (
    <div className="price-chart-shell price-chart-shell--cg">
      <canvas
        ref={canvasRef}
        className={className ?? 'price-canvas'}
        role="img"
        aria-label={ariaLabel ?? (vsCurrency === 'eur' ? 'Graphique en bougies (EUR)' : 'Graphique en bougies (USD)')}
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
        style={{ cursor: 'crosshair', touchAction: 'none' }}
      />
      {hoverCandle && hover != null && (
        <div
          className="price-chart-tooltip"
          style={{
            left: hover.clientX,
            top: hover.clientY,
          }}
        >
          <div className="price-chart-tooltip-price">
            O{' '}
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverCandle.o, localeTag)} €`
              : `$${formatPriceFiat(hoverCandle.o, localeTag)}`}
            {' · '}H{' '}
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverCandle.h, localeTag)} €`
              : `$${formatPriceFiat(hoverCandle.h, localeTag)}`}
          </div>
          <div className="price-chart-tooltip-price">
            L{' '}
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverCandle.l, localeTag)} €`
              : `$${formatPriceFiat(hoverCandle.l, localeTag)}`}
            {' · '}C{' '}
            {vsCurrency === 'eur'
              ? `${formatPriceFiat(hoverCandle.c, localeTag)} €`
              : `$${formatPriceFiat(hoverCandle.c, localeTag)}`}
          </div>
          <div className="price-chart-tooltip-time">
            {new Date(hoverCandle.t).toLocaleString(localeTag, {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  )
}
