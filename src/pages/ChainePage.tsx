import { PageHero, RefreshCadenceBar } from '../components/layout'
import { OfficialContractsPanel, TestnetTelemetryCard } from '../components/overview'
import { useI18n } from '../i18n'

export function ChainePage() {
  const { t } = useI18n()

  return (
    <div className="dash-page">
      <PageHero
        title={t('chaine.title')}
        lead={t('chaine.lead')}
        meta={
          <div className="dash-page-hero__badges" aria-label={t('chaine.scopeAria')}>
            <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-accent">
              {t('chaine.mainnet')}
            </span>
            <span className="dash-page-badge dash-page-badge--chip">{t('chaine.testnet')}</span>
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
