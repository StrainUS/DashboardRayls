/** Pages internes du moniteur — chemins relatifs à la racine du site. */
export const APP_PAGES = [
  { path: 'overview', href: '/', label: 'Vue d’ensemble' },
  { path: 'reseau', href: '/reseau', label: 'Réseau' },
  { path: 'spot', href: '/spot', label: 'Spot' },
  { path: 'chaine', href: '/chaine', label: 'Chaîne' },
  { path: 'referentiel', href: '/referentiel', label: 'Référentiel' },
] as const

export type AppPagePath = (typeof APP_PAGES)[number]['path']
