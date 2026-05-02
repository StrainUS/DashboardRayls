import { Link, NavLink } from 'react-router-dom'
import { prefetchDashboardRoute } from '../../app/prefetchRoutes'
import { APP_PAGES } from '../../constants/appRoutes'
import { BRANDING } from '../../constants/branding'
import { useI18n, type Locale } from '../../i18n'
import { RAYLS_MAINNET, RAYLS_OFFICIAL } from '../../raylsConfig'

function appNavClass({ isActive }: { isActive: boolean }) {
  return `site-pill-link${isActive ? ' site-pill-link--active' : ''}`
}

function navLabelKey(path: (typeof APP_PAGES)[number]['path']): string {
  const map: Record<(typeof APP_PAGES)[number]['path'], string> = {
    overview: 'nav.overview',
    reseau: 'nav.reseau',
    spot: 'nav.spot',
    chaine: 'nav.chaine',
    referentiel: 'nav.referentiel',
  }
  return map[path]
}

export function DashboardHeader() {
  const { locale, setLocale, t } = useI18n()

  const setLang = (next: Locale) => {
    setLocale(next)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <Link
            to="/"
            className="site-header__logo-link"
            aria-label={t('branding.homeAria', { short: t('branding.appNameShort') })}
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
                {t('branding.appName')}
              </Link>
            </p>
            <p className="site-header__subtitle">{t('branding.appNameShort')}</p>
          </div>
        </div>
      </div>

      <div className="site-header__toolbar">
        <nav
          className="site-header__toolbar-nav"
          aria-label={t('nav.toolbarAria')}
        >
          <div className="site-header__nav-rail">
            <div className="site-header__lang" role="group" aria-label={t('lang.switch')}>
              <span className="site-header__lang-label" id="lang-label">
                {t('lang.switch')}
              </span>
              <button
                type="button"
                className={`site-header__lang-btn${locale === 'fr' ? ' site-header__lang-btn--active' : ''}`}
                aria-pressed={locale === 'fr'}
                aria-labelledby="lang-label"
                onClick={() => setLang('fr')}
              >
                {t('lang.fr')}
              </button>
              <button
                type="button"
                className={`site-header__lang-btn${locale === 'en' ? ' site-header__lang-btn--active' : ''}`}
                aria-pressed={locale === 'en'}
                aria-labelledby="lang-label"
                onClick={() => setLang('en')}
              >
                {t('lang.en')}
              </button>
            </div>
            {APP_PAGES.map(({ path, href }) => (
              <NavLink
                key={path}
                to={href}
                className={appNavClass}
                end={path === 'overview'}
                onMouseEnter={() => prefetchDashboardRoute(href)}
                onFocus={() => prefetchDashboardRoute(href)}
              >
                {t(navLabelKey(path))}
              </NavLink>
            ))}
            <span className="site-header__nav-rail-split" aria-hidden />
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_OFFICIAL.site}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('nav.site')}
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_OFFICIAL.docs}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('nav.docs')}
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_MAINNET.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('nav.explorer')}
            </a>
            <a
              className="site-pill-link site-pill-link--external"
              href={RAYLS_MAINNET.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t('nav.chainParamsTitle')}
            >
              {t('nav.chainParams')}
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
