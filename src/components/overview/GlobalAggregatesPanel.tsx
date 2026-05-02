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
  if (n > 0.02) return 'global-agg-delta--up'
  if (n < -0.02) return 'global-agg-delta--down'
  return 'global-agg-delta--flat'
}

function BoardStat({
  label,
  hint,
  value,
  sub,
}: {
  label: string
  hint?: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="global-agg-board-stat">
      <span className="global-agg-board-stat__k" title={hint}>
        {label}
      </span>
      <div className="global-agg-board-stat__v mono">{value}</div>
      {sub ? <div className="global-agg-board-stat__sub mono">{sub}</div> : null}
    </div>
  )
}

function DeltaTile({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div className={`global-agg-delta ${pctToneClass(pct)}`}>
      <span className="global-agg-delta__lbl">{label}</span>
      <span className="global-agg-delta__val mono">{fmtPct(pct)}</span>
    </div>
  )
}

function RankChip({ label, hint, value }: { label: string; hint?: string; value: ReactNode }) {
  return (
    <div className="global-agg-rank-chip" role="listitem" title={hint}>
      <span className="global-agg-rank-chip__k">{label}</span>
      <span className="global-agg-rank-chip__v mono">{value}</span>
    </div>
  )
}

/** Panneau type dashboard pro — endpoint CoinGecko `coins/{id}` (market_data), agrégat tiers. */
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
    const id = window.setInterval(() => {
      if (document.hidden) return
      void load()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [load])

  const syncLabel =
    data != null
      ? (() => {
          const apiMs = data.marketDataLastUpdated ? Date.parse(data.marketDataLastUpdated) : NaN
          const d = Number.isFinite(apiMs) ? new Date(apiMs) : new Date(data.fetchedAt)
          return t('globalAgg.updatedAt', {
            time: d.toLocaleString(loc, { dateStyle: 'short', timeStyle: 'medium' }),
          })
        })()
      : null

  const secondaryRankValue = data?.coingeckoRank ?? data?.marketCapRankWithRehypothecated ?? null
  const secondaryUsesRehyp =
    data != null &&
    data.coingeckoRank == null &&
    data.marketCapRankWithRehypothecated != null
  const secondaryRankLabel =
    secondaryRankValue != null && secondaryUsesRehyp ? t('globalAgg.rankRehypShort') : t('globalAgg.rankCgShort')
  const secondaryRankHint =
    secondaryRankValue != null && secondaryUsesRehyp ? t('globalAgg.hintRankRehyp') : t('globalAgg.hintRankCg')

  return (
    <section className="dash-panel dash-panel--global global-agg-pro" aria-labelledby="global-cg-heading">
      {err &&
        (isCoinGeckoRateLimitMessage(err) ? (
          <CoinGecko429Callout />
        ) : (
          <div className="dash-alert dash-alert--warn" role="status">
            {err}
          </div>
        ))}

      {data && (
        <div className="global-agg-pro__inner">
          <header className="global-agg-pro__header">
            <div className="global-agg-pro__header-row">
              <div className="global-agg-pro__badges" aria-hidden>
                <span className="global-agg-badge">{t('globalAgg.badgeBrand')}</span>
                <kbd className="global-agg-kbd">market_data</kbd>
              </div>
              <div className="global-agg-pro__toolbar">
                {syncLabel ? (
                  <span className="global-agg-sync mono" role="status" title={t('globalAgg.updatedAtHint')}>
                    {syncLabel}
                  </span>
                ) : null}
                <a
                  className="global-agg-pro__cta"
                  href={RAYLS_COINGECKO_PAGE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('globalAgg.cardLink')}
                </a>
              </div>
            </div>
            <h2 id="global-cg-heading" className="global-agg-pro__title">
              {t('globalAgg.panelTitle')}
            </h2>
            <p className="global-agg-pro__lead">{t('globalAgg.metaLead')}</p>
          </header>

          <div className="global-agg-hero">
            <div className="global-agg-hero__identity">
              <span className="global-agg-hero__sym mono">{data.symbol}</span>
              <span className="global-agg-hero__name">{data.name}</span>
            </div>

            <div className="global-agg-hero__main">
              <div className="global-agg-hero__prices">
                <div className="global-agg-hero__usd-block">
                  <span className="global-agg-hero__price-lbl" title={t('globalAgg.hintPrice')}>
                    {t('globalAgg.priceUsd')}
                  </span>
                  <span className="global-agg-hero__usd mono">{fmtUsd(data.currentPriceUsd, false, loc, mdSuffix)}</span>
                </div>
                <div className="global-agg-hero__eur-block">
                  <span className="global-agg-hero__price-lbl">{t('globalAgg.priceEur')}</span>
                  <span className="global-agg-hero__eur mono">
                    {data.currentPriceEur != null
                      ? `${data.currentPriceEur.toLocaleString(loc, { maximumFractionDigits: 8 })} €`
                      : '—'}
                  </span>
                </div>
                <div className="global-agg-hero__ranks" role="list">
                  <RankChip
                    label={t('globalAgg.rankMcShort')}
                    hint={t('globalAgg.hintRankMc')}
                    value={data.marketCapRank ?? '—'}
                  />
                  <RankChip
                    label={secondaryRankLabel}
                    hint={secondaryRankHint}
                    value={secondaryRankValue ?? '—'}
                  />
                </div>
              </div>

              <div className="global-agg-hero__deltas" role="group" aria-label={t('globalAgg.chgTitle')}>
                <span className="global-agg-hero__deltas-lbl" title={t('globalAgg.hintChg')}>
                  {t('globalAgg.chgTitle')}
                </span>
                <div className="global-agg-hero__deltas-grid">
                  <DeltaTile label={t('globalAgg.chg24')} pct={data.priceChange24hPct} />
                  <DeltaTile label={t('globalAgg.chg7')} pct={data.priceChange7dPct} />
                  <DeltaTile label={t('globalAgg.chg30')} pct={data.priceChange30dPct} />
                </div>
              </div>
            </div>
          </div>

          <div className="global-agg-board">
            <section className="global-agg-board__block" aria-labelledby="global-agg-sec-liq">
              <h3 id="global-agg-sec-liq" className="global-agg-board__title">
                {t('globalAgg.groupLiquidity')}
              </h3>
              <div className="global-agg-board__grid global-agg-board__grid--3">
                <BoardStat label={t('globalAgg.mcap')} hint={t('globalAgg.hintMcap')} value={fmtUsd(data.marketCapUsd, true, loc, mdSuffix)} />
                <BoardStat label={t('globalAgg.vol24')} hint={t('globalAgg.hintVol')} value={fmtUsd(data.totalVolumeUsd, true, loc, mdSuffix)} />
                <BoardStat label={t('globalAgg.fdv')} hint={t('globalAgg.hintFdv')} value={fmtUsd(data.fullyDilutedValuationUsd, true, loc, mdSuffix)} />
              </div>
            </section>

            <section className="global-agg-board__block" aria-labelledby="global-agg-sec-range">
              <h3 id="global-agg-sec-range" className="global-agg-board__title">
                {t('globalAgg.groupRange')}
              </h3>
              <div className="global-agg-board__grid global-agg-board__grid--range">
                <div className="global-agg-board-stat global-agg-board-stat--hilo" title={t('globalAgg.hintHiLo')}>
                  <span className="global-agg-board-stat__k">{t('globalAgg.hiLoSection')}</span>
                  <div className="global-agg-hilo-inline">
                    <div>
                      <span className="global-agg-hilo-inline__lbl">{t('globalAgg.hiLabel')}</span>
                      <span className="global-agg-board-stat__v mono">{fmtUsd(data.high24hUsd, false, loc, mdSuffix)}</span>
                    </div>
                    <div className="global-agg-hilo-inline__sep" aria-hidden />
                    <div>
                      <span className="global-agg-hilo-inline__lbl">{t('globalAgg.loLabel')}</span>
                      <span className="global-agg-board-stat__v mono">{fmtUsd(data.low24hUsd, false, loc, mdSuffix)}</span>
                    </div>
                  </div>
                </div>
                <BoardStat
                  label={t('globalAgg.ath')}
                  hint={t('globalAgg.hintAth')}
                  value={fmtUsd(data.athUsd, false, loc, mdSuffix)}
                  sub={data.athDate ? data.athDate.slice(0, 10) : undefined}
                />
                <BoardStat label={t('globalAgg.atl')} hint={t('globalAgg.hintAtl')} value={fmtUsd(data.atlUsd, false, loc, mdSuffix)} />
              </div>
            </section>

            <section className="global-agg-board__block" aria-labelledby="global-agg-sec-supply">
              <h3 id="global-agg-sec-supply" className="global-agg-board__title">
                {t('globalAgg.groupSupply')}
              </h3>
              <div className="global-agg-board__grid global-agg-board__grid--3">
                <BoardStat
                  label={t('globalAgg.circ')}
                  hint={t('globalAgg.hintSupply')}
                  value={
                    data.circulatingSupply != null
                      ? data.circulatingSupply.toLocaleString(loc, { maximumFractionDigits: 2 })
                      : '—'
                  }
                />
                <BoardStat
                  label={t('globalAgg.supplyTotal')}
                  hint={t('globalAgg.hintSupply')}
                  value={
                    data.totalSupply != null ? data.totalSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'
                  }
                />
                <BoardStat
                  label={t('globalAgg.supplyMax')}
                  hint={t('globalAgg.hintSupply')}
                  value={data.maxSupply != null ? data.maxSupply.toLocaleString(loc, { maximumFractionDigits: 2 }) : '—'}
                />
              </div>
            </section>
          </div>

          <p className="global-agg-footnote">{t('globalAgg.sourceNote')}</p>
        </div>
      )}
    </section>
  )
}
