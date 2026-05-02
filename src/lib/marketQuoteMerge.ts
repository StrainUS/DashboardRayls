import type { SimpleQuote } from '../raylsMarket'

export function quoteShallowEqual(a: SimpleQuote | null, b: SimpleQuote | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  const sa = a.usdSource ?? 'coingecko'
  const sb = b.usdSource ?? 'coingecko'
  return (
    a.usd === b.usd &&
    a.eur === b.eur &&
    a.usd24hChange === b.usd24hChange &&
    a.eur24hChange === b.eur24hChange &&
    a.fetchedAt === b.fetchedAt &&
    sa === sb
  )
}

/** Quand le flux MEXC est connecté, on garde le USD « exchange » et on répercute seulement le taux EUR depuis CoinGecko. */
export function mergeCgQuoteWithMexc(
  q: SimpleQuote,
  prev: SimpleQuote | null,
  mexcLive: boolean,
): SimpleQuote {
  if (!mexcLive || !prev || (prev.usdSource ?? 'coingecko') !== 'mexc') {
    return { ...q, usdSource: 'coingecko' }
  }
  const rate =
    q.eur != null && typeof q.usd === 'number' && q.usd > 0 && Number.isFinite(q.usd)
      ? q.eur / q.usd
      : null
  return {
    usd: prev.usd,
    eur: rate != null ? prev.usd * rate : q.eur ?? prev.eur,
    usd24hChange: q.usd24hChange,
    eur24hChange: q.eur24hChange,
    fetchedAt: prev.fetchedAt,
    usdSource: 'mexc',
  }
}

export function mexcTickToQuote(
  prev: SimpleQuote | null,
  tick: { usd: number; at: number },
): { next: SimpleQuote; eurForSeries: number | null } {
  const rate =
    prev && prev.eur != null && prev.usd > 0 && Number.isFinite(prev.usd)
      ? prev.eur / prev.usd
      : null
  const eur = rate != null ? tick.usd * rate : prev?.eur ?? null
  const eurForSeries = eur != null && Number.isFinite(eur) ? eur : null
  return {
    next: {
      usd: tick.usd,
      eur,
      usd24hChange: prev?.usd24hChange ?? null,
      eur24hChange: prev?.eur24hChange ?? null,
      fetchedAt: tick.at,
      usdSource: 'mexc',
    },
    eurForSeries,
  }
}
