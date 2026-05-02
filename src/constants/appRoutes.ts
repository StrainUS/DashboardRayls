/** Pages internes du moniteur — chemins relatifs à la racine du site. */
export const APP_PAGES = [
  { path: 'overview', href: '/' },
  { path: 'reseau', href: '/reseau' },
  { path: 'spot', href: '/spot' },
  { path: 'chaine', href: '/chaine' },
  { path: 'referentiel', href: '/referentiel' },
] as const

export type AppPagePath = (typeof APP_PAGES)[number]['path']
