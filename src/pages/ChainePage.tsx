import { PageHero, RefreshCadenceBar } from '../components/layout'
import { OfficialContractsPanel, TestnetTelemetryCard } from '../components/overview'

export function ChainePage() {
  return (
    <div className="dash-page">
      <PageHero
        title="Chaîne & testnet"
        lead="Contrats et jetons documentés sur le mainnet public, plus la même télémétrie RPC sur le réseau de test — sources indiquées dans chaque bloc."
        meta={
          <div className="dash-page-hero__badges" aria-label="Portée de la page">
            <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-accent">Mainnet</span>
            <span className="dash-page-badge dash-page-badge--chip">Testnet</span>
          </div>
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="testnet" />
        <div className="dash-page-grid-2">
          <OfficialContractsPanel />
          <TestnetTelemetryCard />
        </div>
      </div>
    </div>
  )
}
