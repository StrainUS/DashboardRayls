import { Link } from 'react-router-dom'
import { RaylsOfficialSourcesStrip } from '../components/official'
import { PageHero, RefreshCadenceBar } from '../components/layout'
import { RaylsNewsPanel } from '../components/overview'
import { BRANDING } from '../constants/branding'
import { getDeploymentConfigHints } from '../lib/buildConfigHints'
import { mexcSpotStreamEnabled } from '../lib/mexcSpotStream'
import {
  LIVE_SPOT_INTERVAL_MS,
  NEWS_AND_DOCS_REFRESH_MS,
  OFFICIAL_HUB_REFRESH_MS,
  RPC_POLL_INTERVAL_MS,
  formatPollIntervalFr,
} from '../constants/dashboard'
import { RAYLS_MAINNET } from '../raylsConfig'

type NavTileProps = {
  to: string
  classSuffix: 'reseau' | 'spot' | 'chaine' | 'referentiel'
  eyebrow: string
  title: string
  description: string
  cta: string
}

function NavTile({ to, classSuffix, eyebrow, title, description, cta }: NavTileProps) {
  return (
    <Link className={`dash-overview__tile dash-overview__tile--${classSuffix}`} to={to}>
      <span className="dash-overview__tile-label">{eyebrow}</span>
      <span className="dash-overview__tile-title">{title}</span>
      <p className="dash-overview__tile-desc">{description}</p>
      <span className="dash-overview__tile-arrow">{cta}</span>
    </Link>
  )
}

export function OverviewPage() {
  const deploymentHints = getDeploymentConfigHints()

  const cadenceRows: { label: string; value: string; note: string | null }[] = [
    {
      label: 'RPC mainnet',
      value: formatPollIntervalFr(RPC_POLL_INTERVAL_MS),
      note: 'Batch HTTP ; blocs en push si le fournisseur expose le WebSocket.',
    },
    ...(mexcSpotStreamEnabled()
      ? [
          {
            label: 'Spot USD (bourse)',
            value: 'Flux WebSocket',
            note: 'MEXC — paire configurée ; complété par CoinGecko pour EUR et historique.',
          },
        ]
      : []),
    {
      label: 'Marché CoinGecko',
      value: formatPollIntervalFr(LIVE_SPOT_INTERVAL_MS),
      note: 'Spot agrégé, courbes et panneaux marché (sous quota API).',
    },
    {
      label: 'Hub Rayls',
      value: formatPollIntervalFr(OFFICIAL_HUB_REFRESH_MS),
      note: 'Données publiques api.rayls.com (supplies, etc.).',
    },
    {
      label: 'Flux épinglé',
      value: formatPollIntervalFr(NEWS_AND_DOCS_REFRESH_MS),
      note: 'Fichier JSON ou URL — voir README.',
    },
  ]

  return (
    <div className="dash-page dash-overview">
      <PageHero
        titleId="overview-title"
        title="Vue d’ensemble"
        lead={BRANDING.taglineShort}
        meta={
          <div className="dash-page-hero__badges" aria-label="Contexte réseau">
            <span className="dash-page-badge dash-page-badge--chain">
              <span className="dash-page-badge-k">Chain ID</span>
              <span className="dash-page-badge-v mono">{RAYLS_MAINNET.expectedChainIdDecimal}</span>
            </span>
            <span className="dash-page-badge dash-page-badge--neutral">Outil tiers · non officiel</span>
          </div>
        }
      />

      <section className="dash-overview__block" aria-labelledby="overview-nav-heading">
        <div className="dash-overview__block-head dash-overview__block-head--inline">
          <h2 id="overview-nav-heading" className="dash-overview__h2">
            Où aller
          </h2>
          <p className="dash-overview__block-lede">
            Quatre vues : exploitation RPC, marché, références on-chain, puis le référentiel documentaire.
          </p>
        </div>
        <div className="dash-overview__nav-grid">
          <NavTile
            to="/reseau"
            classSuffix="reseau"
            eyebrow="Exploitation"
            title="Réseau & RPC"
            description="Latence du batch JSON-RPC, gas, tête de chaîne, graphiques — et blocs en direct si le WS est ouvert."
            cta="Ouvrir Réseau"
          />
          <NavTile
            to="/spot"
            classSuffix="spot"
            eyebrow="Marché"
            title="Spot & courbes"
            description="Prix et historiques CoinGecko ; en option, spot USD plus réactif via WebSocket public MEXC (build)."
            cta="Ouvrir Spot"
          />
          <NavTile
            to="/chaine"
            classSuffix="chaine"
            eyebrow="On-chain"
            title="Chaîne & testnet"
            description="Contrats documentés mainnet, lien explorateur, télémétrie testnet."
            cta="Ouvrir Chaîne"
          />
          <NavTile
            to="/referentiel"
            classSuffix="referentiel"
            eyebrow="Documentation"
            title="Référentiel"
            description="Supplies, endpoints publics et liens utiles — chaque valeur cite sa source."
            cta="Ouvrir Référentiel"
          />
        </div>
      </section>

      <section className="dash-overview__block" aria-labelledby="overview-cadence-heading">
        <div className="dash-overview__block-head">
          <h2 id="overview-cadence-heading" className="dash-overview__h2">
            Cadence des données
          </h2>
          <p className="dash-overview__block-lede">
            Rappel des intervalles côté navigateur (pas la latence réseau vers le RPC ou les bourses).
          </p>
        </div>
        <ul className="dash-overview__cadence-list">
          {cadenceRows.map((row) => (
            <li key={row.label} className="dash-overview__cadence-row">
              <div className="dash-overview__cadence-main">
                <span className="dash-overview__cadence-label">{row.label}</span>
                <span className="dash-overview__cadence-value">{row.value}</span>
              </div>
              {row.note ? <p className="dash-overview__cadence-note">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="dash-overview__split">
        <section
          className="dash-overview__split-main dash-overview__block"
          aria-labelledby="overview-news-heading"
        >
          <div className="dash-overview__block-head">
            <h2 id="overview-news-heading" className="dash-overview__h2">
              Actualités & canaux
            </h2>
            <p className="dash-overview__block-lede">
              Liens mis en avant et rafraîchissement du flux JSON configuré pour ce déploiement.
            </p>
          </div>
          <RefreshCadenceBar kind="news" />
          <RaylsNewsPanel />
        </section>

        <aside className="dash-overview__split-aside" aria-label="Déploiement et sources">
          <div className="dash-overview__aside-card">
            <h2 className="dash-overview__aside-title">Ce déploiement</h2>
            <p className="dash-overview__aside-lede">Déduit des variables au build — aucun secret affiché.</p>
            <ul className="dash-overview__config-list dash-overview__config-list--compact">
              {deploymentHints.map((h) => (
                <li key={h.id} className="dash-overview__config-item">
                  <span className="dash-overview__config-label">{h.label}</span>
                  <span className="dash-overview__config-detail">{h.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="dash-overview__sources-panel">
            <RaylsOfficialSourcesStrip />
          </div>
        </aside>
      </div>
    </div>
  )
}
