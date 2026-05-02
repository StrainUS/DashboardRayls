import { RAYLS_MAINNET, RAYLS_MAINNET_PROTOCOL, RAYLS_OFFICIAL } from '../../raylsConfig'

function explorerTokenUrl(address: string): string {
  const a = address.toLowerCase()
  return `${RAYLS_MAINNET.explorerUrl}token/${a}`
}

/**
 * Référence documentaire Rayls : USDr (gas natif + ERC-20), RLS — liens explorateur.
 * Les valeurs on-chain `totalSupply` sont dans le panneau RPC mainnet (batch).
 */
export function OfficialContractsPanel() {
  return (
    <section className="dash-panel dash-panel--contracts" aria-labelledby="contracts-heading">
      <div className="dash-panel-head dash-panel-head--tight">
        <h2 id="contracts-heading" className="dash-panel-title">
          Mainnet
        </h2>
        <a className="dash-panel-meta-link" href={RAYLS_OFFICIAL.circulatingSupplyApi} target="_blank" rel="noopener noreferrer">
          api.rayls.com →
        </a>
      </div>
      <div className="contracts-grid">
        <article className="card card--inset">
          <div className="label">USDr (gas + ERC-20)</div>
          <p className="mono value-sm u-break-anywhere">{RAYLS_MAINNET_PROTOCOL.usdr}</p>
          <a
            className="link-quiet"
            href={explorerTokenUrl(RAYLS_MAINNET_PROTOCOL.usdr)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir sur l’explorateur →
          </a>
        </article>
        <article className="card card--inset">
          <div className="label">RLS (on-chain Rayls)</div>
          <p className="mono value-sm u-break-anywhere">{RAYLS_MAINNET_PROTOCOL.rls}</p>
          <a
            className="link-quiet"
            href={explorerTokenUrl(RAYLS_MAINNET_PROTOCOL.rls)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir sur l’explorateur →
          </a>
        </article>
        <article className="card card--inset">
          <div className="label">Bridge / seeding</div>
          <p className="value-sm">{RAYLS_OFFICIAL.bridge}</p>
          <a className="link-quiet" href={RAYLS_OFFICIAL.bridge} target="_blank" rel="noopener noreferrer">
            Ouvrir →
          </a>
        </article>
      </div>
    </section>
  )
}
