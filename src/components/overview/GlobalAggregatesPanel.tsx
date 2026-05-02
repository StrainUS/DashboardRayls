import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { localeTag } from '../../i18n/translate'
import { fetchCgCoinGeckoGlobal, type CoinGeckoAggregated } from '../../raylsMarket'
import { RAYLS_COINGECKO_PAGE } from '../../raylsConfig'

function fmtUsd(n: number | null, compact: boolean, loc: string, mdSuffix: string): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (compact && Math.abs(n) >= 1e9) {
    return `$${(n / 1e9).toLocaleString(loc, { maximumFractionDigits: 2 })}${mdSuffix}`
  }
  return `$${n.toLocaleString(loc, { maximumFractionDigits: n < 1 ? 8 : 6 })}`
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} %`
}

/** Panneau 1:1 avec l’endpoint CoinGecko `coins/{id}` (market_data) — agrégat mondial tiers, pas la chaîne. */
export function GlobalAggregatesPanel() {
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
  const mdSuffix = t('globalAgg.mdSuffix')
  const [data, setData] = useState<CoinGeckoAggregated | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setErr(null)
      const g = await fetchCgCoinGeckoGlobal()
      setData(g)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    /** Aligné sur le TTL cache `GLOBAL_AGG_FRESH_MS` (90 s) dans `raylsMarket` — évite des réveils inutiles. */
    const id = window.setInterval(() => {
      if (document.hidden) return
      void load()
    }, 90_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <section className="dash-panel dash-panel--global" aria-labelledby="global-cg-heading">
      <div className="dash-panel-head dash-panel-head--tight">
        <h2 id="global-cg-heading" className="dash-panel-title">
          {t('globalAgg.title')}
          <span className="dash-panel-title__muted">{t('globalAgg.titleMuted')}</span>
        </h2>
        <a
          className="dash-panel-meta-link"
          href={RAYLS_COINGECKO_PAGE}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('globalAgg.cardLink')}
        </a>
      </div>

      {err && <div className="dash-alert dash-alert--warn" role="status">{err}</div>}

      {data && (
        <div className="global-agg-grid">
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.rankMc')}</span>
            <span className="global-agg-v mono">{data.marketCapRank ?? '—'}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.rankCg')}</span>
            <span className="global-agg-v mono">{data.coingeckoRank ?? '—'}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.priceUsd')}</span>
            <span className="global-agg-v mono">{fmtUsd(data.currentPriceUsd, false, loc, mdSuffix)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.priceEur')}</span>
            <span className="global-agg-v mono">
              {data.currentPriceEur != null
                ? `${data.currentPriceEur.toLocaleString(loc, { maximumFractionDigits: 8 })} €`
                : '—'}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.mcap')}</span>
            <span className="global-agg-v mono">{fmtUsd(data.marketCapUsd, true, loc, mdSuffix)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.vol24')}</span>
            <span className="global-agg-v mono">{fmtUsd(data.totalVolumeUsd, true, loc, mdSuffix)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.fdv')}</span>
            <span className="global-agg-v mono">{fmtUsd(data.fullyDilutedValuationUsd, true, loc, mdSuffix)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.chg')}</span>
            <span className="global-agg-v mono">
              {fmtPct(data.priceChange24hPct)} · {fmtPct(data.priceChange7dPct)} ·{' '}
              {fmtPct(data.priceChange30dPct)}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.hiLo')}</span>
            <span className="global-agg-v mono">
              {fmtUsd(data.high24hUsd, false, loc, mdSuffix)} / {fmtUsd(data.low24hUsd, false, loc, mdSuffix)}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.ath')}</span>
            <span className="global-agg-v mono">
              {fmtUsd(data.athUsd, false, loc, mdSuffix)}
              {data.athDate ? ` · ${data.athDate.slice(0, 10)}` : ''}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.atl')}</span>
            <span className="global-agg-v mono">{fmtUsd(data.atlUsd, false, loc, mdSuffix)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.circ')}</span>
            <span className="global-agg-v mono">
              {data.circulatingSupply != null
                ? data.circulatingSupply.toLocaleString(loc, { maximumFractionDigits: 2 })
                : '—'}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">{t('globalAgg.supply')}</span>
            <span className="global-agg-v mono">
              {data.totalSupply != null ? data.totalSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'}{' '}
              ·{' '}
              {data.maxSupply != null ? data.maxSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
