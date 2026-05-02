/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COINGECKO_DEMO_API_KEY?: string
  readonly VITE_COINGECKO_PRO_API_KEY?: string
  readonly VITE_COINGECKO_API_ROOT?: string
  readonly VITE_LIVE_SPOT_MS?: string
  readonly VITE_CG_QUOTE_MIN_GAP_MS?: string
  readonly VITE_CG_CHART_MIN_GAP_MS?: string
  /** Pause avant appel OHLC (ms), après throttle chart ; défaut 4500. */
  readonly VITE_CG_OHLC_EXTRA_GAP_MS?: string
  readonly VITE_RPC_POLL_MS?: string
  readonly VITE_RPC_WS_URL?: string
  readonly VITE_OFFICIAL_HUB_POLL_MS?: string
  /** Délai max fetch (ms), entre 5000 et 120000. Défaut 28000. */
  readonly VITE_FETCH_TIMEOUT_MS?: string
  /**
   * URL HTTPS d’un flux JSON (tableau d’objets `{ title, href, publishedAt? }`) pour la zone actualités.
   * Hébergez-le sur votre domaine (CORS) ou un proxy ; voir README.
   */
  readonly VITE_RAYLS_PUBLIC_FEED_URL?: string
  /** Période de re-fetch du flux actualités (ms), min 1_800_000 (30 min). Défaut 6 h. */
  readonly VITE_NEWS_REFRESH_MS?: string
  /** Spot USD quasi temps réel via WebSocket public MEXC (`1` / `true` / `on`). */
  readonly VITE_MEXC_SPOT_WS?: string
  /** Paire spot MEXC sans séparateur, ex. RLSUSDT. Défaut RLSUSDT. */
  readonly VITE_MEXC_SYMBOL?: string
  /** URL WebSocket MEXC ; défaut wss://wbs-api.mexc.com/ws */
  readonly VITE_MEXC_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
