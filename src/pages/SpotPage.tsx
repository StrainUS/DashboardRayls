import { PageHero, RefreshCadenceBar } from '../components/layout'
import { MarketPanel } from '../components/market'
import { GlobalAggregatesPanel } from '../components/overview'
import { spotPageLeadText } from '../lib/marketCadenceCopy'
import { mexcSpotStreamEnabled } from '../lib/mexcSpotStream'

export function SpotPage() {
  return (
    <div className="dash-page dash-spot-page">
      <PageHero
        title="Spot & marché"
        lead={spotPageLeadText()}
        meta={
          mexcSpotStreamEnabled() ? (
            <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-live">MEXC WS actif</span>
          ) : (
            <span className="dash-page-badge dash-page-badge--chip">CoinGecko + option MEXC</span>
          )
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="market" />
        <div className="dash-page__stack dash-page__stack--spot">
          <MarketPanel />
          <GlobalAggregatesPanel />
        </div>
      </div>
    </div>
  )
}
