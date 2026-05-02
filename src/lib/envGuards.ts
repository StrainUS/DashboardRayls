function trimEnv(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

/**
 * Avertit en production si une clé CoinGecko est embarquée sans proxy (visible dans le bundle).
 */
export function warnInsecureProductionConfig(): void {
  if (!import.meta.env.PROD) return
  const proxy = trimEnv('VITE_COINGECKO_API_ROOT')
  if (proxy) return
  const pro = trimEnv('VITE_COINGECKO_PRO_API_KEY')
  const demo = trimEnv('VITE_COINGECKO_DEMO_API_KEY')
  if (!pro && !demo) return
  console.warn(
    '[Rayls Monitor] Clé CoinGecko présente dans le bundle client. Préférez VITE_COINGECKO_API_ROOT vers un proxy backend et adaptez connect-src (CSP) sur Vercel.',
  )
}
