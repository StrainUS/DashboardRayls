import { Link } from 'react-router-dom'
import { BRANDING } from '../../constants/branding'
import { useI18n } from '../../i18n'
import { useNavDrawer } from './NavDrawerContext'

export function DashboardHeader() {
  const { t } = useI18n()
  const { open, toggleDrawer } = useNavDrawer()

  return (
    <header className="site-header site-header--pro">
      <div className="site-header__shell">
        <div className="site-header__row site-header__row--brand">
          <button
            type="button"
            className="site-header__menu-btn"
            onClick={toggleDrawer}
            aria-expanded={open}
            aria-controls="site-nav-drawer"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            <span className="site-header__menu-icon" aria-hidden />
          </button>
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
      </div>
    </header>
  )
}
