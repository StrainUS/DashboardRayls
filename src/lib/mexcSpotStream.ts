/**
 * Flux spot public MEXC (WebSocket) — dernier prix / carnet, sans clé API.
 * Documentation : https://www.mexc.com/api-docs/spot-v3/websocket-market-streams
 */

const DEFAULT_WS = 'wss://wbs-api.mexc.com/ws'
const DEFAULT_SYMBOL = 'RLSUSDT'

function trimEnv(key: string): string {
  return String((import.meta.env as Record<string, string | undefined>)[key] ?? '').trim()
}

/**
 * Spot MEXC (WebSocket) : explicite via `VITE_MEXC_SPOT_WS`.
 * En développement (`npm run dev`), activé par défaut pour une courbe USD plus précise sans saturer CoinGecko.
 * Désactiver : `VITE_MEXC_SPOT_WS=0` dans `.env.local`.
 */
export function mexcSpotStreamEnabled(): boolean {
  const raw = trimEnv('VITE_MEXC_SPOT_WS')
  if (raw.length > 0) {
    const v = raw.toLowerCase()
    return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no'
  }
  return import.meta.env.DEV
}

export function mexcSpotWsUrl(): string {
  const u = trimEnv('VITE_MEXC_WS_URL')
  return u || DEFAULT_WS
}

export function mexcSpotSymbol(): string {
  const s = trimEnv('VITE_MEXC_SYMBOL').toUpperCase()
  return s || DEFAULT_SYMBOL
}

/** Extrait un prix USD (dernier trade ou milieu bid/ask) et l’horodatage serveur si présent. */
export function parseMexcSpotUsdMessage(raw: string): { usd: number; at: number } | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const sendT = Number(o.sendtime ?? o.sendTime)
    const at = Number.isFinite(sendT) ? sendT : Date.now()

    const deals = o.publicdeals as { dealsList?: { price: string; time?: number }[] } | undefined
    if (deals?.dealsList && deals.dealsList.length > 0) {
      const last = deals.dealsList[deals.dealsList.length - 1]!
      const usd = parseFloat(last.price)
      if (!Number.isFinite(usd)) return null
      const t = typeof last.time === 'number' && Number.isFinite(last.time) ? last.time : at
      return { usd, at: t }
    }

    const book = o.publicbookticker as { bidprice?: string; askprice?: string } | undefined
    if (book?.bidprice != null && book?.askprice != null) {
      const bid = parseFloat(book.bidprice)
      const ask = parseFloat(book.askprice)
      if (Number.isFinite(bid) && Number.isFinite(ask)) {
        return { usd: (bid + ask) / 2, at }
      }
    }

    const bookBatch = o.publicBookTickerBatch as {
      items?: { bidPrice?: string; askPrice?: string }[]
    } | undefined
    const batchItem = bookBatch?.items?.[0]
    if (batchItem?.bidPrice != null && batchItem?.askPrice != null) {
      const bid = parseFloat(batchItem.bidPrice)
      const ask = parseFloat(batchItem.askPrice)
      if (Number.isFinite(bid) && Number.isFinite(ask)) {
        return { usd: (bid + ask) / 2, at }
      }
    }

    const mini = o.publicMiniTicker as { price?: string } | undefined
    if (mini?.price != null) {
      const usd = parseFloat(mini.price)
      if (Number.isFinite(usd)) return { usd, at }
    }
  } catch {
    return null
  }
  return null
}

export type MexcSpotStreamStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error'

export type MexcSpotStreamHandlers = {
  onPrice: (tick: { usd: number; at: number }) => void
  onStatus?: (s: MexcSpotStreamStatus, detail?: string) => void
}

/**
 * Abonnement léger avec reconnexion ; envoyer PING périodiquement (exigence MEXC).
 * Ne pas activer plusieurs instances en parallèle sur le même symbole sans besoin.
 */
export function connectMexcSpotStream(h: MexcSpotStreamHandlers): () => void {
  const wsUrl = mexcSpotWsUrl()
  const symbol = mexcSpotSymbol()
  const dealsChannel = `spot@public.aggre.deals.v3.api.pb@100ms@${symbol}`
  const bookChannel = `spot@public.aggre.bookTicker.v3.api.pb@100ms@${symbol}`

  let ws: WebSocket | null = null
  let stopped = false
  let pingId = 0
  let reconnectAttempt = 0
  let reconnectTimer = 0

  const clearReconnect = () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    reconnectTimer = 0
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearReconnect()
    reconnectAttempt += 1
    const delay = Math.min(30_000, 800 * 2 ** Math.min(reconnectAttempt, 6))
    h.onStatus?.('reconnecting', `${delay}ms`)
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = 0
      connect()
    }, delay)
  }

  const connect = () => {
    if (stopped) return
    clearReconnect()
    h.onStatus?.('connecting')
    try {
      ws = new WebSocket(wsUrl)
    } catch (e) {
      h.onStatus?.('error', e instanceof Error ? e.message : 'WebSocket')
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      if (stopped) return
      reconnectAttempt = 0
      h.onStatus?.('open')
      ws!.send(JSON.stringify({ method: 'SUBSCRIPTION', params: [dealsChannel] }))
      ws!.send(JSON.stringify({ method: 'SUBSCRIPTION', params: [bookChannel] }))
      pingId = window.setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ method: 'PING' }))
        }
      }, 25_000)
    }

    ws.onmessage = (ev) => {
      if (stopped) return
      void (async () => {
        let text: string | null = null
        if (typeof ev.data === 'string') {
          text = ev.data
        } else if (ev.data instanceof ArrayBuffer) {
          const s = new TextDecoder().decode(ev.data).trim()
          text = s.startsWith('{') ? s : null
        } else if (ev.data instanceof Blob) {
          try {
            const s = new TextDecoder().decode(await ev.data.arrayBuffer()).trim()
            text = s.startsWith('{') ? s : null
          } catch {
            text = null
          }
        }
        if (!text) return
        const tick = parseMexcSpotUsdMessage(text)
        if (tick) h.onPrice(tick)
      })()
    }

    ws.onerror = () => {
      h.onStatus?.('error', 'Erreur réseau WebSocket')
    }

    ws.onclose = () => {
      window.clearInterval(pingId)
      pingId = 0
      ws = null
      if (!stopped) scheduleReconnect()
    }
  }

  connect()

  return () => {
    stopped = true
    clearReconnect()
    window.clearInterval(pingId)
    pingId = 0
    ws?.close()
    ws = null
    h.onStatus?.('idle')
  }
}
