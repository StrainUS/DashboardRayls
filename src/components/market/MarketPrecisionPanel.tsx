import type { MarketPrecisionAnalysis } from '../../marketPrecision'

type Props = {
  analysis: MarketPrecisionAnalysis
  tfLabel: string
  /** Devise des prix de la série (USD ou EUR). */
  displayCurrency: 'USD' | 'EUR'
}

function fmtUsd(n: number, digits = 8) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: digits })
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 120_000) return `${(ms / 1000).toFixed(1)} s`
  return `${(ms / 60000).toFixed(1)} min`
}

/** Panneau métriques quantitatives (descriptif, pas conseil financier). */
export function MarketPrecisionPanel({ analysis, tfLabel, displayCurrency }: Props) {
  const a = analysis

  return (
    <div className="precision-panel" aria-labelledby="precision-heading">
      <h3 id="precision-heading" className="precision-title">
        Analyse quantitative · {tfLabel}
      </h3>
      <p className="precision-disclaimer">
        Statistiques sur la série CoinGecko affichée en <strong>{displayCurrency}</strong> (granularité imposée par
        l’API). À titre informatif uniquement.
      </p>

      <div className="precision-grid">
        <div className="precision-cell">
          <span className="precision-k">Fenêtre couverte</span>
          <span className="precision-v">{a.windowHuman}</span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Points échantillon</span>
          <span className="precision-v mono">{a.points}</span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Pas moyen entre points</span>
          <span className="precision-v mono">{fmtMs(a.avgSampleStepMs)}</span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Pas min / max</span>
          <span className="precision-v mono">
            {fmtMs(a.minSampleStepMs)} · {fmtMs(a.maxSampleStepMs)}
          </span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Ouverture → clôture (série)</span>
          <span className="precision-v mono">
            {fmtUsd(a.open)} → {fmtUsd(a.close)} ({a.changePct >= 0 ? '+' : ''}
            {a.changePct.toFixed(4)} %)
          </span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Médiane · moyenne</span>
          <span className="precision-v mono">
            {fmtUsd(a.median)} · {fmtUsd(a.meanPrice)}
          </span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Range (haut − bas)</span>
          <span className="precision-v mono">
            {fmtUsd(a.rangeUsd)} ({a.rangePctOfMid.toFixed(4)} % du milieu H/L)
          </span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Volatilité (σ log-rendements)</span>
          <span className="precision-v mono">{a.volatilityLogPct.toFixed(4)} %</span>
        </div>
        <div className="precision-cell">
          <span className="precision-k">Drawdown max (fenêtre)</span>
          <span className="precision-v mono">{a.maxDrawdownPct.toFixed(4)} %</span>
        </div>
        {a.spotVsSeriesCloseUsd != null && a.spotVsSeriesClosePct != null && (
          <div className="precision-cell precision-cell--wide">
            <span className="precision-k">Écart spot API vs dernier point série</span>
            <span className="precision-v mono">
              {a.spotVsSeriesCloseUsd >= 0 ? '+' : ''}
              {fmtUsd(a.spotVsSeriesCloseUsd)} {displayCurrency} · {a.spotVsSeriesClosePct >= 0 ? '+' : ''}
              {a.spotVsSeriesClosePct.toFixed(5)} %
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
