import { PageHero, RefreshCadenceBar } from '../components/layout'
import { MarketPanel } from '../components/market'
import { GlobalAggregatesPanel } from '../components/overview'
import { useI18n } from '../i18n'
import { spotPageLeadText } from '../lib/marketCadenceCopy'
import { mexcSpotStreamEnabled } from '../lib/mexcSpotStream'

export function SpotPage() {
  const { t } = useI18n()

  return (
    <div className="dash-page dash-page--pro dash-spot-page">
      <PageHero
        eyebrow={t('nav.sectionDashboard')}
        title={t('spot.title')}
        lead={spotPageLeadText(t)}
        meta={
          mexcSpotStreamEnabled() ? (
            <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-live">
              {t('spot.badgeMexc')}
            </span>
          ) : (
            <span className="dash-page-badge dash-page-badge--chip">{t('spot.badgeCg')}</span>
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
