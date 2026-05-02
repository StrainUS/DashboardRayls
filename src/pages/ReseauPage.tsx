import { PageHero, RefreshCadenceBar } from '../components/layout'
import { RpcLiveBlock } from '../components/rpc'
import { RAYLS_MAINNET } from '../raylsConfig'

export function ReseauPage() {
  return (
    <div className="dash-page dash-reseau-page">
      <PageHero
        title="Réseau public Rayls"
        lead="Mesure live depuis le navigateur vers le RPC documenté : latence batch, bloc, gas — sans serveur relais."
        meta={
          <dl className="dash-page-hero-facts" aria-label="Identifiants documentés">
            <div className="dash-page-hero-fact">
              <dt>Chain ID</dt>
              <dd className="mono">{RAYLS_MAINNET.expectedChainIdDecimal}</dd>
            </div>
            <div className="dash-page-hero-fact">
              <dt>Réseau</dt>
              <dd>{RAYLS_MAINNET.name}</dd>
            </div>
          </dl>
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="rpc" />
        <RpcLiveBlock />
      </div>
    </div>
  )
}
