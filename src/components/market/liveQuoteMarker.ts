/**
 * Marqueur du dernier point de cotation : position (lx, ly) = projection exacte du prix série
 * (dernier échantillon, déjà fusionné avec le live côté parent). Pas d’animation — évite toute
 * ambiguïté visuelle avec le cours affiché.
 */
export function drawLiveQuoteMarker(ctx: CanvasRenderingContext2D, lx: number, ly: number): void {
  const r = 5
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#f1f5f9'
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.94)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(lx, ly, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
