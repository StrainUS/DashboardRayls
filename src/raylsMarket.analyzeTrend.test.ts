import { describe, expect, it } from 'vitest'
import { analyzeTrend, liveMarkerSentiment } from './raylsMarket'

const H = 3_600_000

describe('analyzeTrend (momentum fin de fenêtre)', () => {
  it('net baisse sur toute la série mais remontée récente → hausse', () => {
    const prices: [number, number][] = [
      [0, 0.005_42],
      [0.5 * H, 0.005_28],
      [1.2 * H, 0.005_3],
      [1.5 * H, 0.005_36],
      [2 * H, 0.005_41],
    ]
    const r = analyzeTrend(prices, 2 * H)
    expect(r.trend).toBe('hausse')
    expect(r.changePct).toBeGreaterThan(0.02)
  })

  it('série courte (<90 s de span) : premier → dernier inchangé', () => {
    const prices: [number, number][] = [
      [0, 100],
      [60_000, 101],
    ]
    const r = analyzeTrend(prices, 2 * H)
    expect(r.trend).toBe('hausse')
    expect(r.open).toBe(100)
    expect(r.close).toBe(101)
  })

  it('palier : stable si variation ≤ 0,02 %', () => {
    const prices: [number, number][] = [
      [0, 1],
      [H, 1.000_1],
      [2 * H, 1.000_1],
    ]
    const r = analyzeTrend(prices, 2 * H)
    expect(r.trend).toBe('stable')
  })

  it('liveMarkerSentiment suit la tendance (vert hausse, rouge baisse)', () => {
    const prices: [number, number][] = [
      [0, 0.005_42],
      [0.5 * H, 0.005_28],
      [1.2 * H, 0.005_3],
      [1.5 * H, 0.005_36],
      [2 * H, 0.005_41],
    ]
    expect(liveMarkerSentiment(prices, 2 * H)).toBe('bullish')
    const downTail: [number, number][] = [
      [0, 0.005_42],
      [0.5 * H, 0.005_28],
      [1.5 * H, 0.005_4],
      [2 * H, 0.005_3],
    ]
    expect(liveMarkerSentiment(downTail, 2 * H)).toBe('bearish')
  })
})
