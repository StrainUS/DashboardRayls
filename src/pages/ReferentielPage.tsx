import { PageHero, RefreshCadenceBar } from '../components/layout'
import { OfficialRaylsHub } from '../components/official'
import { useI18n } from '../i18n'

export function ReferentielPage() {
  const { t } = useI18n()

  return (
    <div className="dash-page">
      <PageHero
        title={t('referentiel.title')}
        lead={t('referentiel.lead')}
        meta={
          <span className="dash-page-badge dash-page-badge--chip dash-page-badge--chip-accent">
            {t('referentiel.hubBadge')}
          </span>
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="hub" />
        <OfficialRaylsHub />
      </div>
    </div>
  )
}
