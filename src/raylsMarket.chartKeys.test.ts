import { describe, expect, it } from 'vitest'
import {
  coingeckoUsesPublicQuota,
  lineSeriesToOhlcCandles,
  marketChartDaysQueryForTimeframe,
  marketChartLoadedKey,
  marketOhlcLoadedKey,
  ohlcDaysForTimeframe,
  preferSyntheticCandles,
  timeframeCandleBucketMs,
} from './raylsMarket'

describe('CoinGecko chart keys (fenêtres spot)', () => {
  it('expose coingeckoUsesPublicQuota', () => {
    expect(typeof coingeckoUsesPublicQuota).toBe('function')
  })

  it('30 j utilise days=30 (pas max) pour alléger l’API', () => {
    expect(marketChartDaysQueryForTimeframe('30d')).toBe(30)
    expect(marketChartLoadedKey('30d', 'usd')).toBe('30:usd')
  })

  it('partage la clé pour les fenêtres courtes à 1 jour CoinGecko', () => {
    expect(marketChartDaysQueryForTimeframe('24h')).toBe(1)
    expect(marketChartLoadedKey('1m', 'usd')).toBe(marketChartLoadedKey('24h', 'usd'))
  })

  it('7 j → days=7', () => {
    expect(marketChartDaysQueryForTimeframe('7d')).toBe(7)
    expect(marketChartLoadedKey('7d', 'eur')).toBe('7:eur')
  })

  it('OHLC : palier minimal (30 j → 30)', () => {
    expect(ohlcDaysForTimeframe('30d')).toBe(30)
    expect(ohlcDaysForTimeframe('7d')).toBe(7)
    expect(marketOhlcLoadedKey('30d', 'usd')).toBe('30:usd')
  })

  it('1 min : bougies synthétiques (OHLC CoinGecko trop grossier)', () => {
    expect(timeframeCandleBucketMs('1m')).toBe(60_000)
    expect(preferSyntheticCandles('1m')).toBe(true)
    expect(preferSyntheticCandles('7d')).toBe(false)
  })

  it('lineSeriesToOhlcCandles regroupe par bucket', () => {
    const pts: [number, number][] = [
      [0, 1],
      [30_000, 1.1],
      [90_000, 0.9],
    ]
    const c = lineSeriesToOhlcCandles(pts, 60_000)
    expect(c.length).toBe(2)
    expect(c[0]!.o).toBe(1)
    expect(c[0]!.c).toBe(1.1)
    expect(c[0]!.h).toBe(1.1)
    expect(c[0]!.l).toBe(1)
    expect(c[1]!.o).toBe(0.9)
    expect(c[1]!.c).toBe(0.9)
  })
})
