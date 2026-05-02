import { describe, expect, it } from 'vitest'
import {
  coingeckoUsesPublicQuota,
  marketChartDaysQueryForTimeframe,
  marketChartLoadedKey,
  marketOhlcLoadedKey,
  ohlcDaysForTimeframe,
} from './raylsMarket'

describe('CoinGecko chart coalescing (429 / quota)', () => {
  it('expose coingeckoUsesPublicQuota', () => {
    expect(typeof coingeckoUsesPublicQuota).toBe('function')
  })

  it('utilise max pour 30 j, 90 j et 1 an', () => {
    expect(marketChartDaysQueryForTimeframe('30d')).toBe('max')
    expect(marketChartDaysQueryForTimeframe('90d')).toBe('max')
    expect(marketChartDaysQueryForTimeframe('1y')).toBe('max')
  })

  it('partage la clé chargée pour les longues fenêtres', () => {
    expect(marketChartLoadedKey('30d', 'usd')).toBe('max:usd')
    expect(marketChartLoadedKey('90d', 'usd')).toBe(marketChartLoadedKey('1y', 'usd'))
  })

  it('garde des jours entiers pour les fenêtres courtes', () => {
    expect(marketChartDaysQueryForTimeframe('7d')).toBe(7)
    expect(marketChartLoadedKey('7d', 'eur')).toBe('7:eur')
    expect(marketChartDaysQueryForTimeframe('24h')).toBe(1)
    expect(marketChartLoadedKey('1m', 'usd')).toBe(marketChartLoadedKey('24h', 'usd'))
  })

  it('OHLC utilise 365 pour 30 j et plus', () => {
    expect(ohlcDaysForTimeframe('30d')).toBe(365)
    expect(ohlcDaysForTimeframe('90d')).toBe(365)
    expect(ohlcDaysForTimeframe('1y')).toBe(365)
    expect(marketOhlcLoadedKey('30d', 'usd')).toBe(marketOhlcLoadedKey('90d', 'usd'))
  })

  it('OHLC garde un palier court pour 7 j', () => {
    expect(ohlcDaysForTimeframe('7d')).toBe(7)
  })
})
