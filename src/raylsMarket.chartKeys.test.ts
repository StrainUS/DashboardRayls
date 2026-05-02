import { describe, expect, it } from 'vitest'
import {
  coingeckoUsesPublicQuota,
  marketChartDaysQueryForTimeframe,
  marketChartLoadedKey,
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
})
