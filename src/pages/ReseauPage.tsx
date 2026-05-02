import { PageHero, RefreshCadenceBar } from '../components/layout'
import { RpcLiveBlock } from '../components/rpc'
import { useI18n } from '../i18n'
import { RAYLS_MAINNET } from '../raylsConfig'

export function ReseauPage() {
  const { t } = useI18n()

  return (
    <div className="dash-page dash-page--pro dash-reseau-page">
      <PageHero
        eyebrow={t('nav.sectionDashboard')}
        title={t('reseau.title')}
        lead={t('reseau.lead')}
        meta={
          <dl className="dash-page-hero-facts" aria-label={t('reseau.factsAria')}>
            <div className="dash-page-hero-fact">
              <dt>{t('common.chainId')}</dt>
              <dd className="mono">{RAYLS_MAINNET.expectedChainIdDecimal}</dd>
            </div>
            <div className="dash-page-hero-fact">
              <dt>{t('reseau.network')}</dt>
              <dd>{RAYLS_MAINNET.name}</dd>
            </div>
          </dl>
        }
      />
      <div className="dash-page-body">
        <RefreshCadenceBar kind="rpc" />
        <RpcLiveBlock />
      </div>
    </div>
  )
}
