import { RAYLS_MAINNET_WS_URL, hexToBigInt } from './raylsConfig'

export type RaylsWsStatus = 'off' | 'connecting' | 'open' | 'closed' | 'error'

export type NewHeadPayload = {
  blockNumber: bigint
}

function parseHeadBlockNumber(result: unknown): bigint | null {
  if (!result || typeof result !== 'object') return null
  const num = (result as { number?: string }).number
  if (typeof num !== 'string' || !num.startsWith('0x')) return null
  try {
    return hexToBigInt(num)
  } catch {
    return null
  }
}

/**
 * Abonnement `eth_subscribe` → `newHeads` (push bloc). Reconnexion automatique si la socket tombe.
 * Sans URL WS (`VITE_RPC_WS_URL=0`), retourne un teardown no-op et statut `off`.
 */
export function subscribeRaylsNewHeads(
  onHead: (payload: NewHeadPayload) => void,
  onStatus?: (s: RaylsWsStatus) => void,
): () => void {
  const wsUrl = RAYLS_MAINNET_WS_URL
  if (!wsUrl) {
    queueMicrotask(() => onStatus?.('off'))
    return () => {}
  }
  const socketUrl = wsUrl

  let closed = false
  let reconnectTimer = 0
  let sock: WebSocket | null = null
  let nextJsonRpcId = 1

  const cleanupSocket = () => {
    if (sock) {
      const s = sock
      sock = null
      s.onclose = null
      s.onerror = null
      s.onmessage = null
      s.onopen = null
      try {
        s.close()
      } catch {
        /* ignore */
      }
    }
  }

  const scheduleReconnect = () => {
    if (closed) return
    window.clearTimeout(reconnectTimer)
    reconnectTimer = window.setTimeout(() => {
      if (!closed) open()
    }, 3200)
  }

  function open() {
    if (closed) return
    cleanupSocket()
    onStatus?.('connecting')

    const ws = new WebSocket(socketUrl)
    sock = ws
    const pending = new Map<number, (row: unknown) => void>()

    ws.onopen = () => {
      if (closed || sock !== ws) return
      onStatus?.('open')
      const id = nextJsonRpcId++
      pending.set(id, (data) => {
        const row = data as { error?: { message: string }; result?: string }
        if (row.error) {
          onStatus?.('error')
          scheduleReconnect()
          return
        }
        if (typeof row.result !== 'string') {
          onStatus?.('error')
          scheduleReconnect()
        }
      })
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id,
          method: 'eth_subscribe',
          params: ['newHeads'],
        }),
      )
    }

    ws.onmessage = (ev) => {
      if (closed || sock !== ws) return
      let j: unknown
      try {
        j = JSON.parse(String(ev.data))
      } catch {
        return
      }
      const row = j as {
        id?: number
        method?: string
        error?: { message: string }
        result?: unknown
        params?: { result?: unknown }
      }

      if (typeof row.id === 'number' && pending.has(row.id)) {
        const fn = pending.get(row.id)!
        pending.delete(row.id)
        fn(row)
        return
      }

      if (row.method === 'eth_subscription' && row.params?.result != null) {
        const bn = parseHeadBlockNumber(row.params.result)
        if (bn != null) onHead({ blockNumber: bn })
      }
    }

    ws.onerror = () => {
      if (!closed && sock === ws) onStatus?.('error')
    }

    ws.onclose = () => {
      if (sock === ws) sock = null
      if (closed) return
      onStatus?.('closed')
      scheduleReconnect()
    }
  }

  open()

  return () => {
    closed = true
    window.clearTimeout(reconnectTimer)
    cleanupSocket()
  }
}
