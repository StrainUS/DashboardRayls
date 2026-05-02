import { Outlet } from 'react-router-dom'
import { RouteDocumentTitle } from './RouteDocumentTitle'
import { DashboardHeader } from '../components/layout'
import { BRANDING } from '../constants/branding'
import { RAYLS_MAINNET } from '../raylsConfig'

/** Layout global : en-tête unifié, contenu de route, mentions et pied de page. */
export function AppLayout() {
  return (
    <div className="dash-root">
      <RouteDocumentTitle />
      <a className="skip-link" href="#contenu-principal">
        Aller au contenu
      </a>
      <div className="dash-sticky-top">
        <DashboardHeader />
      </div>
      <main className="dash-main" id="contenu-principal">
        <div className="dash-main__container">
          <Outlet />
          <p className="dash-disclaimer" role="note">
            {BRANDING.disclaimer} Chaîne cible : Rayls mainnet (chain ID {RAYLS_MAINNET.expectedChainIdDecimal}).
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
            <span className="site-footer__meta">{BRANDING.footerLine}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
