import { describe, expect, it } from 'vitest'
import { candleDisplayBullish } from './chartAxis'

describe('candleDisplayBullish', () => {
  it('corps haussier / baissier classique', () => {
    expect(candleDisplayBullish({ o: 1, h: 2, l: 0.9, c: 1.5 }, null)).toBe(true)
    expect(candleDisplayBullish({ o: 1.5, h: 1.6, l: 0.8, c: 1 }, null)).toBe(false)
  })

  it('corps plat : tie-break vs clôture précédente', () => {
    expect(candleDisplayBullish({ o: 1, h: 1.02, l: 0.98, c: 1 }, { c: 0.95 })).toBe(true)
    expect(candleDisplayBullish({ o: 1, h: 1.02, l: 0.98, c: 1 }, { c: 1.05 })).toBe(false)
  })

  it('doji avec mèche : plus proche du haut → haussier', () => {
    expect(candleDisplayBullish({ o: 1, h: 2, l: 0, c: 1 }, null)).toBe(true)
    expect(candleDisplayBullish({ o: 1, h: 2, l: 0, c: 1 }, { c: 1 })).toBe(true)
  })
})
