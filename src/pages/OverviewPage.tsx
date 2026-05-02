import { RaylsOfficialSourcesStrip } from '../components/official'
import { PageHero, RefreshCadenceBar } from '../components/layout'
import { OverviewNavTiles, RaylsNewsPanel } from '../components/overview'
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
    <div className="dash-page dash-page--pro dash-overview dash-overview--pro">
      <PageHero
        titleId="overview-title"
        eyebrow={t('nav.sectionDashboard')}
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

      <section
        className="dash-overview__block dash-overview__block--surface dash-overview__block--nav"
        aria-labelledby="overview-nav-heading"
      >
        <div className="dash-overview__block-head">
          <h2 id="overview-nav-heading" className="dash-overview__h2">
            {t('overview.navHeading')}
          </h2>
          <p className="dash-overview__block-lede">{t('overview.navLede')}</p>
        </div>
        <OverviewNavTiles />
      </section>

      <section
        className="dash-overview__block dash-overview__block--surface"
        aria-labelledby="overview-cadence-heading"
      >
        <div className="dash-overview__block-head">
          <h2 id="overview-cadence-heading" className="dash-overview__h2">
            {t('overview.cadenceHeading')}
          </h2>
          <p className="dash-overview__block-lede">{t('overview.cadenceLede')}</p>
        </div>
        <ul className="dash-overview__cadence-list dash-overview__cadence-list--pro">
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

      <div className="dash-overview__hub">
        <div className="dash-overview__hub-grid">
          <section
            className="dash-overview__hub-main"
            aria-labelledby="overview-news-heading"
          >
            <div className="dash-overview__hub-main-head">
              <h2 id="overview-news-heading" className="dash-overview__h2">
                {t('overview.newsHeading')}
              </h2>
              <p className="dash-overview__block-lede">{t('overview.newsLede')}</p>
            </div>
            <RefreshCadenceBar kind="news" />
            <RaylsNewsPanel variant="hub" />
          </section>

          <aside className="dash-overview__hub-aside" aria-label={t('sources.title')}>
            <div className="dash-overview__aside-card dash-overview__aside-card--hub">
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
            <div className="dash-overview__sources-panel dash-overview__sources-panel--dense">
              <RaylsOfficialSourcesStrip />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
