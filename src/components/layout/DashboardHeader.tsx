import { Link, NavLink } from 'react-router-dom'
import { prefetchDashboardRoute } from '../../app/prefetchRoutes'
import { APP_PAGES } from '../../constants/appRoutes'
import { BRANDING } from '../../constants/branding'
import { RAYLS_MAINNET, RAYLS_OFFICIAL } from '../../raylsConfig'

function appNavClass({ isActive }: { isActive: boolean }) {
  return `site-pill-link${isActive ? ' site-pill-link--active' : ''}`
}

export function DashboardHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <Link
            to="/"
            className="site-header__logo-link"
            aria-label={`${BRANDING.appNameShort} — accueil`}
          >
            <img
              className="site-header__logo site-header__logo--official"
              src={BRANDING.officialLogoSrc}
              width={120}
              height={48}
              alt="Rayls"
              decoding="async"
            />
          </Link>
          <div className="site-header__titles">
            <p className="site-header__kicker">Rayls</p>
            <p className="site-header__title">
              <Link to="/" className="site-header__title-link">
                {BRANDING.appName}
              </Link>
            </p>
            <p className="site-header__subtitle">{BRANDING.appNameShort}</p>
          </div>
        </div>
      </div>

      <div className="site-header__toolbar">
        <nav
          className="site-header__toolbar-nav"
          aria-label="Vues du tableau de bord et ressources Rayls"
        >
          <div className="site-header__nav-rail">
            {APP_PAGES.map(({ path, href, label }) => (
              <NavLink
                key={path}
                to={href}
                className={appNavClass}
                end={path === 'overview'}
                onMouseEnter={() => prefetchDashboardRoute(href)}
                onFocus={() => prefetchDashboardRoute(href)}
              >
                {label}
              </NavLink>
            ))}
            <span className="site-header__nav-rail-split" aria-hidden />
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_OFFICIAL.site}
              target="_blank"
              rel="noopener noreferrer"
            >
              Site
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_OFFICIAL.docs}
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_MAINNET.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Explorateur
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_MAINNET.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Chain ID, RPC et paramètres réseau publics"
            >
              Paramètres chaîne
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
