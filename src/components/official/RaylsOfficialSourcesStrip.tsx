import { RAYLS_MAINNET, RAYLS_COINGECKO_PAGE, RAYLS_OFFICIAL, RAYLS_TESTNET } from '../../raylsConfig'

const items: { label: string; href: string; detail: string }[] = [
  { label: 'RPC mainnet', href: RAYLS_MAINNET.rpcUrl, detail: 'JSON-RPC POST · latence mesurée dans l’app' },
  { label: 'RPC testnet', href: RAYLS_TESTNET.rpcUrl, detail: `Chain ID ${RAYLS_TESTNET.expectedChainIdDecimal}` },
  { label: 'Explorateur mainnet', href: RAYLS_MAINNET.explorerUrl, detail: 'Blockscout · blocs & transactions' },
  { label: 'Explorateur testnet', href: RAYLS_TESTNET.explorerUrl, detail: 'Réseau de test public' },
  { label: 'Bridge / seeding', href: RAYLS_OFFICIAL.bridge, detail: 'Service documenté par Rayls' },
  { label: 'Docs chain', href: RAYLS_MAINNET.docsUrl, detail: 'Référence réseau public' },
  { label: 'Site', href: RAYLS_OFFICIAL.site, detail: 'rayls.com' },
  { label: 'Documentation', href: RAYLS_OFFICIAL.docs, detail: 'Guides produit' },
  { label: 'PoU', href: RAYLS_OFFICIAL.pouDashboard, detail: 'Tableau de bord' },
  { label: 'Circulating (API)', href: RAYLS_OFFICIAL.circulatingSupplyApi, detail: 'Endpoint public CMC' },
  { label: 'Total supply (API)', href: RAYLS_OFFICIAL.totalSupplyApi, detail: 'Endpoint public CMC' },
  { label: 'CoinGecko RLS', href: RAYLS_COINGECKO_PAGE, detail: 'Spot & market_chart (agrégé)' },
  { label: 'CoinMarketCap', href: RAYLS_OFFICIAL.coinMarketCap, detail: 'Marché agrégé' },
  { label: 'Linktree', href: RAYLS_OFFICIAL.linktree, detail: 'Liens communiqués par Rayls' },
]

export function RaylsOfficialSourcesStrip() {
  return (
    <section className="dash-sources" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="dash-sources-title">
        Sources & mécaniques live
      </h2>
      <p className="dash-sources-lead">
        Ce tableau assemble uniquement des points d’accès publics : RPC Rayls (mesures batch dans l’app),
        API CoinGecko (<code>simple/price</code>, <code>market_chart</code>, <code>coins/…</code>), endpoints
        texte <code>api.rayls.com</code>. Aucune donnée n’est présentée comme « certifiée » par l’éditeur de
        cet outil ; en cas de divergence, prévaloir la source primaire (doc Rayls, explorateur, endpoint).
      </p>
      <ul className="dash-sources-grid">
        {items.map((it) => (
          <li key={it.href} className="dash-sources-item">
            <a className="dash-sources-link" href={it.href} target="_blank" rel="noopener noreferrer">
              {it.label}
            </a>
            <span className="dash-sources-detail">{it.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
