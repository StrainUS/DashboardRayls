import { describe, expect, it } from 'vitest'
import { mergeCgQuoteWithMexc, mexcTickToQuote, quoteShallowEqual } from './marketQuoteMerge'
import type { SimpleQuote } from '../raylsMarket'

const cg: SimpleQuote = {
  usd: 2,
  eur: 1.8,
  usd24hChange: 0.05,
  eur24hChange: 0.04,
  fetchedAt: 1000,
  usdSource: 'coingecko',
}

describe('quoteShallowEqual', () => {
  it('distingue usdSource', () => {
    const a: SimpleQuote = { ...cg, usdSource: 'coingecko' }
    const b: SimpleQuote = { ...cg, usdSource: 'mexc' }
    expect(quoteShallowEqual(a, b)).toBe(false)
  })

  it('considère usdSource omis comme coingecko', () => {
    const a: SimpleQuote = { ...cg }
    const b: SimpleQuote = { ...cg, usdSource: undefined }
    expect(quoteShallowEqual(a, b)).toBe(true)
  })
})

describe('mergeCgQuoteWithMexc', () => {
  it('sans flux MEXC actif, repasse sur CoinGecko', () => {
    const prev: SimpleQuote = { ...cg, usd: 2.5, usdSource: 'mexc', fetchedAt: 2000 }
    const out = mergeCgQuoteWithMexc(cg, prev, false)
    expect(out.usdSource).toBe('coingecko')
    expect(out.usd).toBe(2)
  })

  it('avec MEXC actif, conserve le USD exchange et met à jour le taux EUR', () => {
    const prev: SimpleQuote = { ...cg, usd: 2.5, eur: 2.25, usdSource: 'mexc', fetchedAt: 2000 }
    const freshCg: SimpleQuote = { ...cg, usd: 2, eur: 2.1 }
    const out = mergeCgQuoteWithMexc(freshCg, prev, true)
    expect(out.usd).toBe(2.5)
    expect(out.usdSource).toBe('mexc')
    expect(out.fetchedAt).toBe(2000)
    expect(out.eur).toBeCloseTo(2.5 * (2.1 / 2), 10)
    expect(out.usd24hChange).toBe(0.05)
  })
})

describe('mexcTickToQuote', () => {
  it('projette le tick USD et dérive EUR depuis le taux CoinGecko précédent', () => {
    const prev: SimpleQuote = { ...cg, usd: 2, eur: 1.8 }
    const { next, eurForSeries } = mexcTickToQuote(prev, { usd: 2.2, at: 3000 })
    expect(next.usd).toBe(2.2)
    expect(next.usdSource).toBe('mexc')
    expect(next.fetchedAt).toBe(3000)
    expect(next.eur).toBeCloseTo(1.98, 10)
    expect(eurForSeries).toBeCloseTo(1.98, 10)
  })

  it('sans taux EUR, laisse eur null', () => {
    const prev: SimpleQuote = { ...cg, eur: null }
    const { next, eurForSeries } = mexcTickToQuote(prev, { usd: 2.2, at: 3000 })
    expect(next.eur).toBeNull()
    expect(eurForSeries).toBeNull()
  })
})
