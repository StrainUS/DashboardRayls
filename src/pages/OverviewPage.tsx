import { Link } from 'react-router-dom'
import { RaylsOfficialSourcesStrip } from '../components/official'
import { PageHero, RefreshCadenceBar } from '../components/layout'
import { RaylsNewsPanel } from '../components/overview'
import { getDeploymentConfigHints } from '../lib/buildConfigHints'
import { useI18n } from '../i18n'
import { mexcSpotStreamEnabled } from '../lib/mexcSpotStream'
import {
  LIVE_SPOT_INTERVAL_MS,
  NEWS_AND_DOCS_REFRESH_MS,
  OFFICIAL_HUB_REFRESH_MS,
  RPC_POLL_INTERVAL_MS,
  formatPollInterval,
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
  const { locale, t } = useI18n()
  const deploymentHints = getDeploymentConfigHints(t)

  const cadenceRows: { label: string; value: string; note: string | null }[] = [
    {
      label: t('overview.cadence.rpcMainnet'),
      value: formatPollInterval(RPC_POLL_INTERVAL_MS, locale),
      note: t('overview.cadence.rpcMainnetNote'),
    },
    ...(mexcSpotStreamEnabled()
      ? [
          {
            label: t('overview.cadence.spotMexc'),
            value: t('overview.cadence.spotMexcValue'),
            note: t('overview.cadence.spotMexcNote'),
          },
        ]
      : []),
    {
      label: t('overview.cadence.marketCg'),
      value: formatPollInterval(LIVE_SPOT_INTERVAL_MS, locale),
      note: t('overview.cadence.marketCgNote'),
    },
    {
      label: t('overview.cadence.hub'),
      value: formatPollInterval(OFFICIAL_HUB_REFRESH_MS, locale),
      note: t('overview.cadence.hubNote'),
    },
    {
      label: t('overview.cadence.feed'),
      value: formatPollInterval(NEWS_AND_DOCS_REFRESH_MS, locale),
      note: t('overview.cadence.feedNote'),
    },
  ]

  return (
    <div className="dash-page dash-overview">
      <PageHero
        titleId="overview-title"
        title={t('overview.title')}
        lead={t('branding.taglineShort')}
        meta={
          <div className="dash-page-hero__badges" aria-label={t('reseau.factsAria')}>
            <span className="dash-page-badge dash-page-badge--chain">
              <span className="dash-page-badge-k">{t('common.chainId')}</span>
              <span className="dash-page-badge-v mono">{RAYLS_MAINNET.expectedChainIdDecimal}</span>
            </span>
            <span className="dash-page-badge dash-page-badge--neutral">{t('common.toolThirdParty')}</span>
          </div>
        }
      />

      <section className="dash-overview__block" aria-labelledby="overview-nav-heading">
        <div className="dash-overview__block-head dash-overview__block-head--inline">
          <h2 id="overview-nav-heading" className="dash-overview__h2">
            {t('overview.navHeading')}
          </h2>
          <p className="dash-overview__block-lede">{t('overview.navLede')}</p>
        </div>
        <div className="dash-overview__nav-grid">
          <NavTile
            to="/reseau"
            classSuffix="reseau"
            eyebrow={t('overview.tiles.reseauEyebrow')}
            title={t('overview.tiles.reseauTitle')}
            description={t('overview.tiles.reseauDesc')}
            cta={t('overview.tiles.reseauCta')}
          />
          <NavTile
            to="/spot"
            classSuffix="spot"
            eyebrow={t('overview.tiles.spotEyebrow')}
            title={t('overview.tiles.spotTitle')}
            description={t('overview.tiles.spotDesc')}
            cta={t('overview.tiles.spotCta')}
          />
          <NavTile
            to="/chaine"
            classSuffix="chaine"
            eyebrow={t('overview.tiles.chainEyebrow')}
            title={t('overview.tiles.chainTitle')}
            description={t('overview.tiles.chainDesc')}
            cta={t('overview.tiles.chainCta')}
          />
          <NavTile
            to="/referentiel"
            classSuffix="referentiel"
            eyebrow={t('overview.tiles.refEyebrow')}
            title={t('overview.tiles.refTitle')}
            description={t('overview.tiles.refDesc')}
            cta={t('overview.tiles.refCta')}
          />
        </div>
      </section>

      <section className="dash-overview__block" aria-labelledby="overview-cadence-heading">
        <div className="dash-overview__block-head">
          <h2 id="overview-cadence-heading" className="dash-overview__h2">
            {t('overview.cadenceHeading')}
          </h2>
          <p className="dash-overview__block-lede">{t('overview.cadenceLede')}</p>
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
              {t('overview.newsHeading')}
            </h2>
            <p className="dash-overview__block-lede">{t('overview.newsLede')}</p>
          </div>
          <RefreshCadenceBar kind="news" />
          <RaylsNewsPanel />
        </section>

        <aside className="dash-overview__split-aside" aria-label={t('sources.title')}>
          <div className="dash-overview__aside-card">
            <h2 className="dash-overview__aside-title">{t('overview.deployTitle')}</h2>
            <p className="dash-overview__aside-lede">{t('overview.deployLede')}</p>
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
