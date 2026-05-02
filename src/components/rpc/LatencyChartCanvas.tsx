import { memo, useEffect, useLayoutEffect, useRef } from 'react'

export type LatencySample = { t: number; ms: number }

type Props = {
  /** Une entrée par mesure RPC (timestamp + latence brute). */
  samples: LatencySample[]
  /** `fr-FR` / `en-US` — format des graduations. */
  localeTag?: string
  /** Canvas vide (aucun échantillon). */
  emptyLabel?: string
  /** Accessibilité du canvas. */
  ariaLabel?: string
  className?: string
}

const AXIS_BOTTOM = 28
const AXIS_TOP = 10
const AXIS_RIGHT = 10
const AXIS_LABEL_GAP = 10
const Y_TICKS = 5
const AXIS_FONT = '11px "IBM Plex Mono", ui-monospace, SF Mono, Menlo, monospace'

function yBounds(minV: number, maxV: number): { lo: number; hi: number } {
  let lo = minV
  let hi = maxV
  if (hi < lo) [lo, hi] = [hi, lo]
  const span = hi - lo
  const pad = Math.max(span * 0.12, 1)
  return { lo: lo - pad, hi: hi + pad }
}

function fmtMsAxis(n: number, span: number, loc: string): string {
  const maxFrac = span >= 180 ? 0 : span >= 40 ? 0 : 1
  return n.toLocaleString(loc, {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0,
  })
}

function timeTickStep(spanMs: number): number {
  const target = Math.max(spanMs / 5, 500)
  const steps = [
    1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000,
    30 * 60_000, 3600_000,
  ]
  for (const s of steps) {
    if (s >= target * 0.75) return s
  }
  return steps[steps.length - 1]!
}

function sortedByT(samples: LatencySample[]): LatencySample[] {
  if (samples.length < 2) return samples
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]!.t < samples[i - 1]!.t) {
      return [...samples].sort((a, b) => a.t - b.t)
    }
  }
  return samples
}

/**
 * Graphique latence **réelle** : pas de lissage ni rAF continu — une mesure = un point, segments droits, axes lisibles.
 */
function LatencyChartCanvasInner({
  samples,
  localeTag = 'fr-FR',
  emptyLabel = '…',
  ariaLabel = 'Latency',
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const samplesRef = useRef(samples)
  const localeRef = useRef(localeTag)
  const emptyRef = useRef(emptyLabel)
  const drawRef = useRef<() => void>(() => {})

  useEffect(() => {
    samplesRef.current = samples
    drawRef.current()
  }, [samples])

  useLayoutEffect(() => {
    localeRef.current = localeTag
    emptyRef.current = emptyLabel
    drawRef.current()
  }, [localeTag, emptyLabel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let bufW = 0
    let bufH = 0
    let bufDpr = 0

    const draw = () => {
      const pts = sortedByT(samplesRef.current)
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

      const chartR = w - AXIS_RIGHT
      const chartT = AXIS_TOP
      const chartB = h - AXIS_BOTTOM

      if (pts.length === 0) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(161, 161, 170, 0.65)'
        ctx.font = '12px system-ui, sans-serif'
        ctx.fillText(emptyRef.current, w / 2, h / 2)
        return
      }

      let minMs = pts[0]!.ms
      let maxMs = pts[0]!.ms
      for (const p of pts) {
        if (p.ms < minMs) minMs = p.ms
        if (p.ms > maxMs) maxMs = p.ms
      }
      const { lo, hi } = yBounds(minMs, maxMs)
      const ySpan = Math.max(hi - lo, 1e-9)

      ctx.font = AXIS_FONT
      let maxLabelW = 34
      for (let i = 0; i <= Y_TICKS; i++) {
        const v = lo + (i / Y_TICKS) * (hi - lo)
        maxLabelW = Math.max(maxLabelW, ctx.measureText(fmtMsAxis(v, ySpan, localeRef.current)).width)
      }
      const minPlotW = 64
      const desiredLeft = Math.max(40, Math.ceil(maxLabelW + AXIS_LABEL_GAP))
      const chartL = Math.max(36, Math.min(desiredLeft, chartR - minPlotW))
      const cw = chartR - chartL
      const ch = chartB - chartT

      let tMin = pts[0]!.t
      let tMax = pts[pts.length - 1]!.t
      if (pts.length === 1) {
        const half = 45_000
        tMin -= half
        tMax += half
      }
      const tSpan = Math.max(tMax - tMin, 1)

      const nx = (t: number) => chartL + ((t - tMin) / tSpan) * cw
      const ny = (ms: number) => chartT + (1 - (ms - lo) / ySpan) * ch

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i <= Y_TICKS; i++) {
        const v = lo + (i / Y_TICKS) * (hi - lo)
        const y = ny(v)
        ctx.beginPath()
        ctx.moveTo(chartL, y)
        ctx.lineTo(chartR, y)
        ctx.stroke()
        ctx.fillStyle = 'rgba(203, 213, 225, 0.88)'
        ctx.font = AXIS_FONT
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(fmtMsAxis(v, ySpan, localeRef.current), chartL - 4, y)
      }

      const step = timeTickStep(tSpan)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = '10px "IBM Plex Mono", ui-monospace, Menlo, monospace'
      ctx.fillStyle = 'rgba(186, 198, 214, 0.82)'
      for (let tx = Math.ceil(tMin / step) * step; tx <= tMax + step * 0.01; tx += step) {
        if (tx < tMin) continue
        const x = nx(tx)
        if (x < chartL - 2 || x > chartR + 2) continue
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
        ctx.beginPath()
        ctx.moveTo(x, chartT)
        ctx.lineTo(x, chartB)
        ctx.stroke()
        const d = new Date(tx)
        const loc = localeRef.current
        const lab =
          tSpan <= 120_000
            ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
        ctx.fillText(lab, x, chartB + 6)
      }

      if (pts.length >= 1) {
        const grad = ctx.createLinearGradient(0, chartB, 0, chartT)
        grad.addColorStop(0, 'rgba(91, 141, 239, 0.05)')
        grad.addColorStop(1, 'rgba(125, 211, 252, 0.1)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(nx(pts[0]!.t), chartB)
        for (const p of pts) {
          ctx.lineTo(nx(p.t), ny(p.ms))
        }
        ctx.lineTo(nx(pts[pts.length - 1]!.t), chartB)
        ctx.closePath()
        ctx.fill()
      }

      ctx.strokeStyle = 'rgba(125, 211, 252, 0.92)'
      ctx.lineWidth = 2
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.beginPath()
      pts.forEach((p, i) => {
        const x = nx(p.t)
        const y = ny(p.ms)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.fillStyle = 'rgba(224, 242, 254, 0.95)'
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!
        const x = nx(p.t)
        const y = ny(p.ms)
        const r = i === pts.length - 1 ? 4 : 2.5
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      if (pts.length > 0) {
        const last = pts[pts.length - 1]!
        const lx = nx(last.t)
        const ly = ny(last.ms)
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(lx, ly, 6.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    drawRef.current = draw
    draw()
    const ro = new ResizeObserver(() => drawRef.current())
    ro.observe(canvas)
    return () => {
      drawRef.current = () => {}
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'latency-canvas'}
      role="img"
      aria-label={ariaLabel}
    />
  )
}

export const LatencyChartCanvas = memo(LatencyChartCanvasInner)
