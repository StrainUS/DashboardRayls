/**
 * Infobulles en `position: fixed` : garde le bloc dans la zone visible (encoches, barre d’adresse, TV).
 */
export function getChartTooltipFixedPosition(clientX: number, clientY: number): {
  left: number
  top: number
  flipBelow: boolean
} {
  if (typeof window === 'undefined') {
    return { left: clientX, top: clientY, flipBelow: false }
  }

  const vv = window.visualViewport
  const margin = 8
  const halfW = 84
  const vw = vv?.width ?? window.innerWidth
  const vh = vv?.height ?? window.innerHeight

  const left = Math.min(Math.max(clientX, margin + halfW), Math.max(margin + halfW + 1, vw - margin - halfW))

  const topReserve = Math.min(112, vh * 0.2)
  const flipBelow = clientY < topReserve
  const top = flipBelow
    ? Math.min(Math.max(clientY + 14, margin + 40), vh - margin)
    : clientY

  return { left, top, flipBelow }
}
