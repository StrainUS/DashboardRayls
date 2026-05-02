import { mexcSpotStreamEnabled } from './mexcSpotStream'

function trimEnv(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

function coingeckoDeploymentSummary(): string {
  const proxy = trimEnv('VITE_COINGECKO_API_ROOT')
  if (proxy) {
    try {
      const host = new URL(proxy).host
      return `Proxy marché vers ${host} (recommandé en production).`
    } catch {
      return 'Proxy marché configuré (URL à vérifier).'
    }
  }
  if (import.meta.env.DEV) {
    return 'Développement : appels via proxy Vite /api/coingecko.'
  }
  const pro = trimEnv('VITE_COINGECKO_PRO_API_KEY')
  const demo = trimEnv('VITE_COINGECKO_DEMO_API_KEY')
  if (pro || demo) {
    return 'Clé CoinGecko embarquée côté client — préférez VITE_COINGECKO_API_ROOT en production.'
  }
  return 'API CoinGecko publique (quotas serrés sans clé ni proxy).'
}

export type DeploymentConfigHint = {
  id: string
  label: string
  detail: string
}

/** Résumé non sensible du déploiement (build-time), pour la vue d’ensemble. */
export function getDeploymentConfigHints(): DeploymentConfigHint[] {
  return [
    {
      id: 'coingecko',
      label: 'API marché (CoinGecko)',
      detail: coingeckoDeploymentSummary(),
    },
    {
      id: 'mexc',
      label: 'Spot exchange (MEXC)',
      detail: mexcSpotStreamEnabled()
        ? 'WebSocket spot USD activé — vérifier connect-src (ex. vercel.json).'
        : 'Désactivé par défaut. Activer avec VITE_MEXC_SPOT_WS=1 pour un prix USD plus réactif.',
    },
  ]
}
