import { mexcSpotStreamEnabled } from './mexcSpotStream'

function trimEnv(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

export type DeploymentConfigHint = {
  id: string
  label: string
  detail: string
}

type TFn = (key: string, vars?: Record<string, string | number>) => string

function coingeckoDeploymentSummary(t: TFn): string {
  const proxy = trimEnv('VITE_COINGECKO_API_ROOT')
  if (proxy) {
    try {
      const host = new URL(proxy).host
      return t('deployment.coingecko.proxyHost', { host })
    } catch {
      return t('deployment.coingecko.proxyBadUrl')
    }
  }
  if (import.meta.env.DEV) {
    return t('deployment.coingecko.dev')
  }
  const pro = trimEnv('VITE_COINGECKO_PRO_API_KEY')
  const demo = trimEnv('VITE_COINGECKO_DEMO_API_KEY')
  if (pro || demo) {
    return t('deployment.coingecko.keysClient')
  }
  return t('deployment.coingecko.public')
}

/** Résumé non sensible du déploiement (build-time), pour la vue d’ensemble. */
export function getDeploymentConfigHints(t: TFn): DeploymentConfigHint[] {
  return [
    {
      id: 'coingecko',
      label: t('deployment.coingecko.label'),
      detail: coingeckoDeploymentSummary(t),
    },
    {
      id: 'mexc',
      label: t('deployment.mexc.label'),
      detail: mexcSpotStreamEnabled() ? t('deployment.mexc.on') : t('deployment.mexc.off'),
    },
  ]
}
