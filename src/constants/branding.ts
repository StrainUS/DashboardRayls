/**
 * Libellés produit (UI, métadonnées) — source unique pour cohérence et maintenance.
 */
export const BRANDING = {
  /** Logo de marque Rayls (fichier statique dans `public/`, sans lien avec l’éditeur de cet outil). */
  officialLogoSrc: '/rayls-logo-official.png',
  appName: 'Surveillance du réseau public',
  appNameShort: 'Rayls Network Monitor',
  tagline:
    'Lecture technique du mainnet et du testnet publics Rayls : RPC documenté, explorateur, agrégats de marché (CoinGecko, prestataire tiers) et endpoints publiés par Rayls — chiffres présentés avec attribution de source, sans validation par Rayls ni par CoinGecko.',
  taglineShort:
    'RPC documenté, explorateur, marché (CoinGecko, tiers) et endpoints publics Rayls — sources indiquées.',
  disclaimer:
    'Application indépendante : pas d’affiliation, d’aval ou de parrainage par Rayls, CoinGecko ou tout autre tiers cité. Les valeurs affichées reproduisent les réponses des services indiqués (RPC JSON-RPC, API CoinGecko, api.rayls.com) au moment de la requête ; elles ne constituent pas une attestation d’exactitude, de complétude ni une recommandation. Les agrégats de marché ne représentent pas l’ensemble des plateformes d’échange. Contenu strictement informatif — pas un conseil financier, juridique ou en investissement.',
  footerLine:
    'Surveillance réseau public · Sources : RPC & doc Rayls, CoinGecko (marché), api.rayls.com · Outil tiers non officiel',
} as const
