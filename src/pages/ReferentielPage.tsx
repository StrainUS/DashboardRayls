import { PageHero, RefreshCadenceBar } from '../components/layout'
import { OfficialRaylsHub } from '../components/official'

export function ReferentielPage() {
  return (
    <div className="dash-page">
      <PageHero
        title="Référentiel Rayls"
        lead="Supplies via api.rayls.com, liens vers les canaux documentés par Rayls, et métadonnées CoinGecko — chaque donnée reste attribuée à sa source."
        meta={
          <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-accent">Hub public</span>
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="hub" />
        <OfficialRaylsHub />
      </div>
    </div>
  )
}
