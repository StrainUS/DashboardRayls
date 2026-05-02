import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BRANDING } from '../constants/branding'

const TITLES: Record<string, string> = {
  '/': 'Vue d’ensemble',
  '/reseau': 'Réseau',
  '/spot': 'Spot & marché',
  '/chaine': 'Chaîne & testnet',
  '/referentiel': 'Référentiel',
}

/** Met à jour le titre du document selon la route (onglet du navigateur). */
export function RouteDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const section = TITLES[pathname] ?? 'Accueil'
    document.title = `${section} · ${BRANDING.appNameShort}`
  }, [pathname])
  return null
}
