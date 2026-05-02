import { NavLink } from 'react-router-dom'
import { prefetchDashboardRoute } from '../../app/prefetchRoutes'
import { APP_PAGES, type AppPagePath } from '../../constants/appRoutes'
import { useI18n } from '../../i18n'

const TILE_PREFIX: Record<Exclude<AppPagePath, 'overview'>, 'reseau' | 'spot' | 'chain' | 'ref'> = {
  reseau: 'reseau',
  spot: 'spot',
  chaine: 'chain',
  referentiel: 'ref',
}

/**
 * Grille d’accès aux vues principales (hors vue d’ensemble courante) — vue d’ensemble.
 */
export function OverviewNavTiles() {
  const { t } = useI18n()
  const pages = APP_PAGES.filter((p) => p.path !== 'overview')

  return (
    <ul className="dash-overview__nav-grid">
      {pages.map(({ path, href }) => {
        const tk = TILE_PREFIX[path]
        return (
          <li key={path}>
            <NavLink
              to={href}
              className={({ isActive }) =>
                `dash-overview-tile dash-overview-tile--${path}${isActive ? ' dash-overview-tile--active' : ''}`
              }
              onMouseEnter={() => prefetchDashboardRoute(href)}
              onFocus={() => prefetchDashboardRoute(href)}
            >
              <span className="dash-overview-tile__eyebrow">{t(`overview.tiles.${tk}Eyebrow`)}</span>
              <span className="dash-overview-tile__title">{t(`overview.tiles.${tk}Title`)}</span>
              <span className="dash-overview-tile__desc">{t(`overview.tiles.${tk}Desc`)}</span>
              <span className="dash-overview-tile__cta">{t(`overview.tiles.${tk}Cta`)}</span>
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}
