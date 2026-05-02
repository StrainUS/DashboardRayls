import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'

/** Met à jour le titre du document selon la route (onglet du navigateur). */
export function RouteDocumentTitle() {
  const { pathname } = useLocation()
  const { t } = useI18n()

  const titles = useMemo(
    () => ({
      '/': t('routes.overview'),
      '/reseau': t('routes.reseau'),
      '/spot': t('routes.spot'),
      '/chaine': t('routes.chaine'),
      '/referentiel': t('routes.referentiel'),
    }),
    [t],
  )

  useEffect(() => {
    const section = titles[pathname as keyof typeof titles] ?? t('routes.home')
    document.title = `${section} · ${t('branding.appNameShort')}`
  }, [pathname, titles, t])

  return null
}
