export type LiveQuoteMarkerSentiment = 'bullish' | 'bearish'

type DrawOpts = {
  /** Horloge monotonic (ex. `performance.now()`) — pulsation / teinte. */
  nowMs?: number
  sentiment?: LiveQuoteMarkerSentiment
}

const BULL_FILL_A = 'rgba(74, 222, 128, 0.98)'
const BULL_FILL_B = 'rgba(187, 247, 208, 0.92)'
const BEAR_FILL_A = 'rgba(248, 113, 113, 0.98)'
const BEAR_FILL_B = 'rgba(254, 226, 226, 0.9)'

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function parseRgb(rgba: string): [number, number, number] {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return [241, 245, 249]
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function mixRgba(a: string, b: string, t: number): string {
  const [r0, g0, b0] = parseRgb(a)
  const [r1, g1, b1] = parseRgb(b)
  const u = Math.max(0, Math.min(1, t))
  return `rgb(${lerpChannel(r0, r1, u)}, ${lerpChannel(g0, g1, u)}, ${lerpChannel(b0, b1, u)})`
}

/**
 * Marqueur du dernier cours : pulsation + alternance de teinte (live), pour tous les timeframes.
 * Nécessite un redraw canvas régulier (boucle rAF côté parent tant que l’onglet est visible).
 */
export function drawLiveQuoteMarker(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  opts?: DrawOpts,
): void {
  const now = opts?.nowMs ?? performance.now()
  const t = now / 1000
  const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.15 * t)
  const hueOsc = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.85 * t)
  const bearish = opts?.sentiment === 'bearish'

  const fillA = bearish ? BEAR_FILL_A : BULL_FILL_A
  const fillB = bearish ? BEAR_FILL_B : BULL_FILL_B
  const fill = mixRgba(fillA, fillB, 0.35 + 0.65 * hueOsc)
  const stroke = 'rgba(15, 23, 42, 0.92)'

  const r = 4.2 + pulse * 2.2
  const glowA = bearish ? 'rgba(248, 113, 113, 0.55)' : 'rgba(74, 222, 128, 0.5)'
  const glowB = bearish ? 'rgba(254, 202, 202, 0.35)' : 'rgba(187, 247, 208, 0.35)'
  const glow = mixRgba(glowA, glowB, hueOsc)

  ctx.save()
  ctx.shadowColor = glow
  ctx.shadowBlur = 5 + pulse * 10
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(lx, ly, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
