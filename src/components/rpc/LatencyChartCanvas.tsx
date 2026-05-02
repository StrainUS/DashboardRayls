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
  /**
   * Intervalle typique entre mesures (ex. poll RPC). Sert à dimensionner les marges temps
   * et limiter le « saut » horizontal quand une nouvelle mesure arrive.
   */
  sampleIntervalHintMs?: number
}

const AXIS_BOTTOM = 28
const AXIS_TOP = 10
const AXIS_RIGHT = 10
const AXIS_LABEL_GAP = 10
const Y_TICKS = 5
const AXIS_FONT = '11px "IBM Plex Mono", ui-monospace, SF Mono, Menlo, monospace'

/** Fenêtre Y minimale (~ms) pour éviter le « zoom » nerveux quand la série varie peu. */
const Y_MIN_HALF_SPAN_MS = 28
/** 1 = latences brutes reliées par segments droits ; >1 = moyenne glissante (adoucit le tracé). */
const ROLL_MS_WINDOW = 1
/** Frames d’animation après chaque nouvelle mesure : axe Y se rapproche progressivement de la cible. */
const AXIS_ANIM_FRAMES = 14
const AXIS_LERP = 0.22

/** Marge sur l’axe temps : fraction de la plage données + plancher (évite le redimensionnement horizontal brutal). */
const TIME_PAD_FRAC = 0.2
const TIME_PAD_MIN_MS = 12_000
const TIME_PAD_HINT_MULT = 5

/**
 * Cible d’axe Y centrée sur les données, avec demi-plage minimum — moins d’à-coups que min/max + petit pourcentage.
 */
function yAxisTarget(minMs: number, maxMs: number): { lo: number; hi: number } {
  let lo = minMs
  let hi = maxMs
  if (hi < lo) [lo, hi] = [hi, lo]
  const mid = (lo + hi) / 2
  const span = hi - lo
  const half = Math.max(span * 0.52, Y_MIN_HALF_SPAN_MS)
  return { lo: mid - half, hi: mid + half }
}

function rollingMsAt(pts: LatencySample[], i: number, window: number): number {
  const w = Math.max(1, window)
  const half = Math.floor(w / 2)
  let a = i - half
  let b = i + (w - 1 - half)
  a = Math.max(0, a)
  b = Math.min(pts.length - 1, b)
  let s = 0
  let c = 0
  for (let k = a; k <= b; k++) {
    s += pts[k]!.ms
    c++
  }
  return s / c
}

function displaySeries(pts: LatencySample[]): LatencySample[] {
  if (pts.length <= 1 || ROLL_MS_WINDOW <= 1) return pts
  return pts.map((p, i) => ({ t: p.t, ms: rollingMsAt(pts, i, ROLL_MS_WINDOW) }))
}

/** Graphique linéaire : segments droits entre mesures successives. */
function traceLinearLine(
  ctx: CanvasRenderingContext2D,
  pts: LatencySample[],
  nx: (t: number) => number,
  ny: (ms: number) => number,
) {
  if (pts.length === 0) return
  ctx.moveTo(nx(pts[0]!.t), ny(pts[0]!.ms))
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!
    ctx.lineTo(nx(p.t), ny(p.ms))
  }
}

/** Aire sous la ligne (polygone fermé par le bas). */
function fillUnderLinear(
  ctx: CanvasRenderingContext2D,
  pts: LatencySample[],
  nx: (t: number) => number,
  ny: (ms: number) => number,
  chartB: number,
) {
  if (pts.length === 0) return
  const first = pts[0]!
  ctx.moveTo(nx(first.t), chartB)
  ctx.lineTo(nx(first.t), ny(first.ms))
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!
    ctx.lineTo(nx(p.t), ny(p.ms))
  }
  ctx.lineTo(nx(pts[pts.length - 1]!.t), chartB)
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
 * Historique de latence : graphique linéaire (segments droits), sans marqueurs sur chaque point.
 * Axes stables (marges temps / lerp Y). Les min/avg/max du bloc RPC restent calculés sur les mesures brutes côté parent.
 */
function LatencyChartCanvasInner({
  samples,
  localeTag = 'fr-FR',
  emptyLabel = '…',
  ariaLabel = 'Latency',
  className,
  sampleIntervalHintMs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const samplesRef = useRef(samples)
  const localeRef = useRef(localeTag)
  const emptyRef = useRef(emptyLabel)
  const drawRef = useRef<() => void>(() => {})
  const yAxisRef = useRef<{ lo: number; hi: number } | null>(null)
  const sampleHintRef = useRef(sampleIntervalHintMs)

  useLayoutEffect(() => {
    sampleHintRef.current = sampleIntervalHintMs
  }, [sampleIntervalHintMs])

  useEffect(() => {
    samplesRef.current = samples
    let frame = 0
    let raf = 0
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      drawRef.current()
      frame++
      if (frame < AXIS_ANIM_FRAMES) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
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
        yAxisRef.current = null
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(161, 161, 170, 0.65)'
        ctx.font = '12px system-ui, sans-serif'
        ctx.fillText(emptyRef.current, w / 2, h / 2)
        return
      }

      const ptsDisp = displaySeries(pts)
      let minMs = pts[0]!.ms
      let maxMs = pts[0]!.ms
      for (const p of pts) {
        if (p.ms < minMs) minMs = p.ms
        if (p.ms > maxMs) maxMs = p.ms
      }
      const pad = 8
      const tgt = yAxisTarget(minMs, maxMs)
      tgt.lo = Math.min(tgt.lo, minMs - pad)
      tgt.hi = Math.max(tgt.hi, maxMs + pad)

      let ax = yAxisRef.current
      if (!ax) {
        ax = { lo: tgt.lo, hi: tgt.hi }
      } else {
        ax = {
          lo: ax.lo + (tgt.lo - ax.lo) * AXIS_LERP,
          hi: ax.hi + (tgt.hi - ax.hi) * AXIS_LERP,
        }
      }
      ax.lo = Math.min(ax.lo, minMs - pad)
      ax.hi = Math.max(ax.hi, maxMs + pad)
      yAxisRef.current = ax
      const lo = ax.lo
      const hi = ax.hi
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
      const cw = Math.max(8, chartR - chartL)
      const ch = chartB - chartT

      const tFirst = pts[0]!.t
      const tLast = pts[pts.length - 1]!.t
      const hint = Math.max(300, sampleHintRef.current ?? 1000)
      let tMin: number
      let tMax: number
      if (pts.length === 1) {
        const half = 45_000
        tMin = tFirst - half
        tMax = tFirst + half
      } else {
        const dataSpan = Math.max(tLast - tFirst, 1)
        const pad = Math.max(dataSpan * TIME_PAD_FRAC, TIME_PAD_MIN_MS, hint * TIME_PAD_HINT_MULT)
        tMin = tFirst - pad * 0.35
        tMax = tLast + pad * 0.65
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

      if (ptsDisp.length >= 2) {
        const grad = ctx.createLinearGradient(0, chartB, 0, chartT)
        grad.addColorStop(0, 'rgba(56, 100, 180, 0.04)')
        grad.addColorStop(1, 'rgba(125, 211, 252, 0.06)')
        ctx.fillStyle = grad
        ctx.beginPath()
        fillUnderLinear(ctx, ptsDisp, nx, ny, chartB)
        ctx.closePath()
        ctx.fill()
      }

      ctx.strokeStyle = 'rgba(147, 200, 255, 0.95)'
      ctx.lineWidth = 1.75
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.beginPath()
      traceLinearLine(ctx, ptsDisp, nx, ny)
      ctx.stroke()

      if (ptsDisp.length === 1) {
        const p = ptsDisp[0]!
        ctx.fillStyle = 'rgba(147, 200, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(nx(p.t), ny(p.ms), 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    drawRef.current = draw
    draw()
    let roRaf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf)
      roRaf = requestAnimationFrame(() => drawRef.current())
    })
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(roRaf)
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
