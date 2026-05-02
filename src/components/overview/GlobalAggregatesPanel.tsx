import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { localeTag } from '../../i18n/translate'
import { fetchCgCoinGeckoGlobal, type CoinGeckoAggregated } from '../../raylsMarket'
import { RAYLS_COINGECKO_PAGE } from '../../raylsConfig'
import { isCoinGeckoRateLimitMessage } from '../../lib/coinGeckoRateLimit'
import { CoinGecko429Callout } from '../market/CoinGecko429Callout'

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

function pctToneClass(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ''
  if (n > 0.02) return 'global-agg-pct--up'
  if (n < -0.02) return 'global-agg-pct--down'
  return 'global-agg-pct--flat'
}

function AggCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="global-agg-cell">
      <span className="global-agg-k">{label}</span>
      {children}
    </div>
  )
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
    return () => window.clearInterval(id)
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

      {err &&
        (isCoinGeckoRateLimitMessage(err) ? (
          <CoinGecko429Callout />
        ) : (
          <div className="dash-alert dash-alert--warn" role="status">
            {err}
          </div>
        ))}

      {data && (
        <div className="global-agg-grid">
          <AggCell label={t('globalAgg.rankMc')}>
            <span className="global-agg-v mono">{data.marketCapRank ?? '—'}</span>
          </AggCell>
          <AggCell label={t('globalAgg.rankCg')}>
            <span className="global-agg-v mono">{data.coingeckoRank ?? '—'}</span>
          </AggCell>
          <AggCell label={t('globalAgg.priceUsd')}>
            <span className="global-agg-v mono">{fmtUsd(data.currentPriceUsd, false, loc, mdSuffix)}</span>
          </AggCell>
          <AggCell label={t('globalAgg.priceEur')}>
            <span className="global-agg-v mono">
              {data.currentPriceEur != null
                ? `${data.currentPriceEur.toLocaleString(loc, { maximumFractionDigits: 8 })} €`
                : '—'}
            </span>
          </AggCell>

          <AggCell label={t('globalAgg.mcap')}>
            <span className="global-agg-v mono">{fmtUsd(data.marketCapUsd, true, loc, mdSuffix)}</span>
          </AggCell>
          <AggCell label={t('globalAgg.vol24')}>
            <span className="global-agg-v mono">{fmtUsd(data.totalVolumeUsd, true, loc, mdSuffix)}</span>
          </AggCell>
          <AggCell label={t('globalAgg.fdv')}>
            <span className="global-agg-v mono">{fmtUsd(data.fullyDilutedValuationUsd, true, loc, mdSuffix)}</span>
          </AggCell>

          <div className="global-agg-cell global-agg-cell--chg" role="group" aria-label={t('globalAgg.chgTitle')}>
            <span className="global-agg-k">{t('globalAgg.chgTitle')}</span>
            <div className="global-agg-chg">
              <div className="global-agg-chg-item">
                <span className="global-agg-chg-lbl">{t('globalAgg.chg24')}</span>
                <span className={`global-agg-chg-val mono ${pctToneClass(data.priceChange24hPct)}`}>
                  {fmtPct(data.priceChange24hPct)}
                </span>
              </div>
              <div className="global-agg-chg-item">
                <span className="global-agg-chg-lbl">{t('globalAgg.chg7')}</span>
                <span className={`global-agg-chg-val mono ${pctToneClass(data.priceChange7dPct)}`}>
                  {fmtPct(data.priceChange7dPct)}
                </span>
              </div>
              <div className="global-agg-chg-item">
                <span className="global-agg-chg-lbl">{t('globalAgg.chg30')}</span>
                <span className={`global-agg-chg-val mono ${pctToneClass(data.priceChange30dPct)}`}>
                  {fmtPct(data.priceChange30dPct)}
                </span>
              </div>
            </div>
          </div>

          <AggCell label={t('globalAgg.hiLo')}>
            <span className="global-agg-v mono">
              {fmtUsd(data.high24hUsd, false, loc, mdSuffix)} / {fmtUsd(data.low24hUsd, false, loc, mdSuffix)}
            </span>
          </AggCell>
          <AggCell label={t('globalAgg.ath')}>
            <span className="global-agg-v mono">{fmtUsd(data.athUsd, false, loc, mdSuffix)}</span>
            {data.athDate ? (
              <span className="global-agg-v-sub mono">{data.athDate.slice(0, 10)}</span>
            ) : null}
          </AggCell>
          <AggCell label={t('globalAgg.atl')}>
            <span className="global-agg-v mono">{fmtUsd(data.atlUsd, false, loc, mdSuffix)}</span>
          </AggCell>
          <AggCell label={t('globalAgg.circ')}>
            <span className="global-agg-v mono">
              {data.circulatingSupply != null
                ? data.circulatingSupply.toLocaleString(loc, { maximumFractionDigits: 2 })
                : '—'}
            </span>
          </AggCell>

          <div className="global-agg-cell global-agg-cell--wide global-agg-cell--supply">
            <div className="global-agg-supply">
              <div className="global-agg-supply-col">
                <span className="global-agg-k">{t('globalAgg.supplyTotal')}</span>
                <span className="global-agg-v mono">
                  {data.totalSupply != null ? data.totalSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'}
                </span>
              </div>
              <div className="global-agg-supply-col">
                <span className="global-agg-k">{t('globalAgg.supplyMax')}</span>
                <span className="global-agg-v mono">
                  {data.maxSupply != null ? data.maxSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
