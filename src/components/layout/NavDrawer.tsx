import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { prefetchDashboardRoute } from '../../app/prefetchRoutes'
import { APP_PAGES, APP_PAGE_LABEL_KEYS } from '../../constants/appRoutes'
import { useI18n, type Locale } from '../../i18n'
import { RAYLS_MAINNET, RAYLS_OFFICIAL } from '../../raylsConfig'
import { useNavDrawer } from './NavDrawerContext'

function appNavClass({ isActive }: { isActive: boolean }) {
  return `nav-drawer__link${isActive ? ' nav-drawer__link--active' : ''}`
}

export function NavDrawer() {
  const { open, closeDrawer } = useNavDrawer()
  const { locale, setLocale, t } = useI18n()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const id = window.requestAnimationFrame(() => closeBtnRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.cancelAnimationFrame(id)
    }
  }, [open, closeDrawer])

  const setLang = (next: Locale) => {
    setLocale(next)
  }

  return (
    <>
      <div
        className={`nav-drawer-backdrop${open ? ' nav-drawer-backdrop--open' : ''}`}
        aria-hidden={!open}
        onClick={closeDrawer}
        role="presentation"
      />
      <div
        id="site-nav-drawer"
        className={`nav-drawer${open ? ' nav-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.drawerAria')}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="nav-drawer__head">
          <span className="nav-drawer__brand">{t('branding.appNameShort')}</span>
          <button
            ref={closeBtnRef}
            type="button"
            className="nav-drawer__close"
            onClick={closeDrawer}
            aria-label={t('nav.closeMenu')}
          >
            <span className="nav-drawer__close-icon" aria-hidden />
          </button>
        </div>
        <nav className="nav-drawer__body" aria-label={t('nav.toolbarAria')}>
          <p className="nav-drawer__section-k">{t('nav.sectionDashboard')}</p>
          <ul className="nav-drawer__list">
            {APP_PAGES.map(({ path, href }) => (
              <li key={path}>
                <NavLink
                  to={href}
                  className={appNavClass}
                  end={path === 'overview'}
                  onMouseEnter={() => prefetchDashboardRoute(href)}
                  onFocus={() => prefetchDashboardRoute(href)}
                  onClick={() => closeDrawer()}
                >
                  {t(APP_PAGE_LABEL_KEYS[path])}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="nav-drawer__section-k">{t('nav.sectionLinks')}</p>
          <ul className="nav-drawer__list">
            <li>
              <a
                className="nav-drawer__link nav-drawer__link--external"
                href={RAYLS_OFFICIAL.site}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closeDrawer()}
              >
                {t('nav.site')}
              </a>
            </li>
            <li>
              <a
                className="nav-drawer__link nav-drawer__link--external"
                href={RAYLS_OFFICIAL.docs}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closeDrawer()}
              >
                {t('nav.docs')}
              </a>
            </li>
            <li>
              <a
                className="nav-drawer__link nav-drawer__link--external"
                href={RAYLS_MAINNET.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closeDrawer()}
              >
                {t('nav.explorer')}
              </a>
            </li>
            <li>
              <a
                className="nav-drawer__link nav-drawer__link--external"
                href={RAYLS_MAINNET.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('nav.chainParamsTitle')}
                onClick={() => closeDrawer()}
              >
                {t('nav.chainParams')}
              </a>
            </li>
            <li>
              <NavLink
                to="/legal"
                className={appNavClass}
                onClick={() => closeDrawer()}
              >
                {t('nav.legal')}
              </NavLink>
            </li>
          </ul>
          <div className="nav-drawer__lang" role="group" aria-label={t('lang.switch')}>
            <span className="nav-drawer__lang-label" id="drawer-lang-label">
              {t('lang.switch')}
            </span>
            <div className="nav-drawer__lang-btns">
              <button
                type="button"
                className={`nav-drawer__lang-btn${locale === 'fr' ? ' nav-drawer__lang-btn--active' : ''}`}
                aria-pressed={locale === 'fr'}
                aria-labelledby="drawer-lang-label"
                onClick={() => setLang('fr')}
              >
                {t('lang.fr')}
              </button>
              <button
                type="button"
                className={`nav-drawer__lang-btn${locale === 'en' ? ' nav-drawer__lang-btn--active' : ''}`}
                aria-pressed={locale === 'en'}
                aria-labelledby="drawer-lang-label"
                onClick={() => setLang('en')}
              >
                {t('lang.en')}
              </button>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}
