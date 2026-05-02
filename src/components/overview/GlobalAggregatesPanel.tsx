import { useCallback, useEffect, useState } from 'react'
import { fetchCgCoinGeckoGlobal, type CoinGeckoAggregated } from '../../raylsMarket'
import { RAYLS_COINGECKO_PAGE } from '../../raylsConfig'

function fmtUsd(n: number | null, compact = false): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (compact && Math.abs(n) >= 1e9) {
    return `$${(n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md`
  }
  return `$${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 1 ? 8 : 6 })}`
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} %`
}

/** Panneau 1:1 avec l’endpoint CoinGecko `coins/{id}` (market_data) — agrégat mondial tiers, pas la chaîne. */
export function GlobalAggregatesPanel() {
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
          CoinGecko · <span className="dash-panel-title__muted">market_data</span>
        </h2>
        <a
          className="dash-panel-meta-link"
          href={RAYLS_COINGECKO_PAGE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Fiche →
        </a>
      </div>

      {err && <div className="dash-alert dash-alert--warn" role="status">{err}</div>}

      {data && (
        <div className="global-agg-grid">
          <div className="global-agg-cell">
            <span className="global-agg-k">Rang market cap</span>
            <span className="global-agg-v mono">{data.marketCapRank ?? '—'}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Rang CoinGecko</span>
            <span className="global-agg-v mono">{data.coingeckoRank ?? '—'}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Prix USD</span>
            <span className="global-agg-v mono">{fmtUsd(data.currentPriceUsd)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Prix EUR</span>
            <span className="global-agg-v mono">
              {data.currentPriceEur != null
                ? `${data.currentPriceEur.toLocaleString('fr-FR', { maximumFractionDigits: 8 })} €`
                : '—'}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Capitalisation</span>
            <span className="global-agg-v mono">{fmtUsd(data.marketCapUsd, true)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Volume 24 h</span>
            <span className="global-agg-v mono">{fmtUsd(data.totalVolumeUsd, true)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">FDV</span>
            <span className="global-agg-v mono">{fmtUsd(data.fullyDilutedValuationUsd, true)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Variation 24 h / 7 j / 30 j</span>
            <span className="global-agg-v mono">
              {fmtPct(data.priceChange24hPct)} · {fmtPct(data.priceChange7dPct)} ·{' '}
              {fmtPct(data.priceChange30dPct)}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">High / Low 24 h (USD)</span>
            <span className="global-agg-v mono">
              {fmtUsd(data.high24hUsd)} / {fmtUsd(data.low24hUsd)}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">ATH (USD)</span>
            <span className="global-agg-v mono">
              {fmtUsd(data.athUsd)}
              {data.athDate ? ` · ${data.athDate.slice(0, 10)}` : ''}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">ATL (USD)</span>
            <span className="global-agg-v mono">{fmtUsd(data.atlUsd)}</span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Offre circulante (CG)</span>
            <span className="global-agg-v mono">
              {data.circulatingSupply != null
                ? data.circulatingSupply.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                : '—'}
            </span>
          </div>
          <div className="global-agg-cell">
            <span className="global-agg-k">Offre totale / max (CG)</span>
            <span className="global-agg-v mono">
              {data.totalSupply != null ? data.totalSupply.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}{' '}
              ·{' '}
              {data.maxSupply != null ? data.maxSupply.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
