import { isSafeHttpOrHttpsUrl } from './lib/safeUrl'

function envStr(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

/**
 * Réseau public Rayls (mainnet) — cf. https://docs.rayls.com/docs/public-chain-reference
 */
export const RAYLS_MAINNET = {
  name: 'Rayls Mainnet',
  rpcUrl: 'https://mainnet-rpc.rayls.com',
  expectedChainIdDecimal: 72_957,
  docsUrl: 'https://docs.rayls.com/docs/public-chain-reference',
  /**
   * Explorateur Blockscout pour le mainnet public.
   * La documentation Rayls cite `https://mainnet-explorer.rayls.com/` ; si ce domaine ne répond pas,
   * l’instance actuellement servie pour le grand public est `https://explorer.rayls.com/`.
   * À réaligner sur la doc si Rayls unifie l’URL canonique.
   */
  explorerUrl: 'https://explorer.rayls.com/',
} as const

/** Testnet public — cf. documentation Rayls (chain ID, RPC, explorateur, faucet). */
export const RAYLS_TESTNET = {
  name: 'Rayls Testnet',
  rpcUrl: 'https://testnet-rpc.rayls.com',
  expectedChainIdDecimal: 7_295_799,
  docsUrl: 'https://docs.rayls.com/docs/public-chain-reference',
  explorerUrl: 'https://testnet-explorer.rayls.com/',
  faucetUrl: 'https://devnet-dapp.rayls.com/',
} as const

/**
 * URL utilisée pour les POST JSON-RPC **depuis le navigateur**.
 * `mainnet-rpc.rayls.com` renvoie `Access-Control-Allow-Origin` pour localhost (dev),
 * pas pour `*.github.io` — sur GitHub Pages, définir `VITE_RAYLS_RPC_HTTP_URL` vers un proxy
 * HTTPS qui relaie vers le RPC (voir `workers/rpc-cors-proxy/`).
 * L’URL **affichée** dans l’UI reste `RAYLS_MAINNET.rpcUrl` (référence doc).
 */
export function raylsMainnetRpcHttpUrl(): string {
  const o = envStr('VITE_RAYLS_RPC_HTTP_URL')
  if (o) {
    if (!isSafeHttpOrHttpsUrl(o)) {
      console.warn('[Rayls Monitor] VITE_RAYLS_RPC_HTTP_URL ignorée (URL https invalide ou non autorisée).')
      return RAYLS_MAINNET.rpcUrl
    }
    return o.replace(/\/$/, '')
  }
  return RAYLS_MAINNET.rpcUrl
}

export function raylsTestnetRpcHttpUrl(): string {
  const o = envStr('VITE_RAYLS_TESTNET_RPC_HTTP_URL')
  if (o) {
    if (!isSafeHttpOrHttpsUrl(o)) {
      console.warn('[Rayls Monitor] VITE_RAYLS_TESTNET_RPC_HTTP_URL ignorée (URL https invalide).')
      return RAYLS_TESTNET.rpcUrl
    }
    return o.replace(/\/$/, '')
  }
  return RAYLS_TESTNET.rpcUrl
}

/**
 * Adresses documentées sur la chaîne publique Rayls (gas token USDr, RLS).
 * totalSupply on-chain via eth_call — à comparer aux endpoints api.rayls.com / CoinGecko.
 */
export const RAYLS_MAINNET_PROTOCOL = {
  usdr: '0x0000000000000000000000000000000000000400',
  rls: '0x07e17e17e17e17e17e17e17e17e17e17e17e17ea',
} as const

function parseOptionalWsUrl(raw: string): string | null {
  const low = raw.toLowerCase()
  if (low === '0' || low === 'false' || low === 'off' || low === 'disabled') return null
  const trimmed = raw.replace(/\/$/, '')
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'wss:' && u.protocol !== 'ws:') return null
    return trimmed
  } catch {
    return null
  }
}

/**
 * WebSocket JSON-RPC pour `eth_subscribe` (`newHeads`). Désactiver : `VITE_RPC_WS_URL=0`.
 * URL personnalisée si le fournisseur utilise un host différent du HTTPS.
 * Valeur invalide (non ws/wss) → pas de socket (évite une connexion vers une URL accidentelle).
 */
export const RAYLS_MAINNET_WS_URL: string | null = (() => {
  const raw = envStr('VITE_RPC_WS_URL')
  if (raw) {
    const parsed = parseOptionalWsUrl(raw)
    return parsed
  }
  return 'wss://mainnet-rpc.rayls.com'
})()

/** Identifiant CoinGecko du jeton RLS (marché spot agrégé — tiers). */
export const RAYLS_COINGECKO_ID = 'rayls' as const

/** Page marché agrégée RLS sur CoinGecko (API + lien public). */
export const RAYLS_COINGECKO_PAGE = 'https://www.coingecko.com/en/coins/rayls' as const

/**
 * Ressources et endpoints publics Rayls (site, docs, supplies exposées pour agrégateurs type CoinMarketCap).
 * Les cours affichés dans l’app proviennent de CoinGecko (tiers), pas de ces URLs seules.
 */
export const RAYLS_OFFICIAL = {
  site: 'https://www.rayls.com/',
  docs: 'https://docs.rayls.com/',
  litepaper: 'https://www.rayls.com/litepaper',
  blog: 'https://www.rayls.com/blog',
  bridge: 'https://seeding.rayls.com/',
  pouDashboard: 'https://pou.rayls.com/',
  linktree: 'https://linktr.ee/raylsChain',
  circulatingSupplyApi: 'https://api.rayls.com/v1/rls/circulating-supply/cmc',
  totalSupplyApi: 'https://api.rayls.com/v1/rls/total-supply/cmc',
  etherscanToken: 'https://etherscan.io/token/0xb5f7b021a78f470d31d762c1dda05ea549904fbd',
  bscscanToken: 'https://bscscan.com/token/0x17ea10b6ae4fde59fdbf471bd28ab9710f508816',
  coinMarketCap: 'https://coinmarketcap.com/currencies/rayls/',
} as const

export function hexToBigInt(hex: string): bigint {
  return BigInt(hex.startsWith('0x') ? hex : `0x${hex}`)
}
