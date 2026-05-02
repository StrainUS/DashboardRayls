/**
 * Précharge le chunk JS d’une vue au survol / focus du lien (sans changer de route).
 * Réduit la latence perçue au premier clic sur Spot, Chaîne ou Référentiel.
 */
export function prefetchDashboardRoute(href: string): void {
  switch (href) {
    case '/':
      void import('../pages/ReseauPage')
      void import('../pages/SpotPage')
      break
    case '/spot':
      void import('../pages/SpotPage')
      break
    case '/chaine':
      void import('../pages/ChainePage')
      break
    case '/referentiel':
      void import('../pages/ReferentielPage')
      break
    default:
      break
  }
}
