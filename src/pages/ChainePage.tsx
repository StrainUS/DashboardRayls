import { PageHero } from '../components/layout'
import { OfficialContractsPanel } from '../components/overview'
import { useI18n } from '../i18n'

export function ChainePage() {
  const { t } = useI18n()

  return (
    <div className="dash-page dash-page--pro dash-chaine-page">
      <PageHero
        eyebrow={t('nav.sectionDashboard')}
        title={t('chaine.title')}
        lead={t('chaine.lead')}
        meta={
          <div className="dash-page-hero__badges" aria-label={t('chaine.scopeAria')}>
            <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-accent">
              {t('chaine.mainnet')}
            </span>
          </div>
        }
      />
      <div className="dash-page-body">
        <OfficialContractsPanel />
      </div>
    </div>
  )
}
