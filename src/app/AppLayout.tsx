import { Outlet } from 'react-router-dom'
import { DashboardHeader, NavDrawer, NavDrawerProvider } from '../components/layout'
import { BRANDING } from '../constants/branding'
import { useI18n } from '../i18n'
import { RAYLS_MAINNET } from '../raylsConfig'
import { RouteDocumentTitle } from './RouteDocumentTitle'

/** Layout global : en-tête unifié, contenu de route, mentions et pied de page. */
export function AppLayout() {
  const { t } = useI18n()

  return (
    <NavDrawerProvider>
      <div className="dash-root">
        <RouteDocumentTitle />
        <a className="skip-link" href="#contenu-principal">
          {t('common.skipContent')}
        </a>
        <div className="dash-sticky-top">
          <DashboardHeader />
        </div>
        <NavDrawer />
        <main className="dash-main" id="contenu-principal">
          <div className="dash-main__container">
            <Outlet />
            <p className="dash-disclaimer" role="note">
              {t('branding.disclaimer')} {t('common.targetChain', { id: RAYLS_MAINNET.expectedChainIdDecimal })}
            </p>
          </div>
        </main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <img
              src={BRANDING.officialLogoSrc}
              width={80}
              height={32}
              alt=""
              className="site-footer__mark site-footer__logo--official"
              decoding="async"
            />
            <div className="site-footer__text">
              <span className="site-footer__brand">Rayls</span>
              <span className="site-footer__meta">{t('branding.footerLine')}</span>
            </div>
          </div>
        </footer>
      </div>
    </NavDrawerProvider>
  )
}
