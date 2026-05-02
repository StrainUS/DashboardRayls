import { fetchWithTimeout } from './lib/fetchUtil'
import { raylsMainnetRpcHttpUrl } from './raylsConfig'

export async function raylsRpcBatch(): Promise<{
  chainIdHex: string
  blockHex: string
  gasPriceHex: string
  /** Aller-retour réseau + lecture corps (performance.now, sous-ms). */
  latencyMs: number
}> {
  const body = [
    { jsonrpc: '2.0' as const, id: 1, method: 'eth_chainId', params: [] },
    { jsonrpc: '2.0' as const, id: 2, method: 'eth_blockNumber', params: [] },
    { jsonrpc: '2.0' as const, id: 3, method: 'eth_gasPrice', params: [] },
  ]
  const t0 = performance.now()
  const res = await fetchWithTimeout(raylsMainnetRpcHttpUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  })
  const latencyMs = performance.now() - t0
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  const arr = (await res.json()) as Array<{
    id: number
    result?: string
    error?: { message: string }
  }>
  const byId = new Map(arr.map((x) => [x.id, x]))
  const pick = (id: number, label: string) => {
    const row = byId.get(id)
    if (!row?.result) {
      throw new Error(row?.error?.message ?? `${label}: missing result`)
    }
    return row.result
  }
  return {
    chainIdHex: pick(1, 'eth_chainId'),
    blockHex: pick(2, 'eth_blockNumber'),
    gasPriceHex: pick(3, 'eth_gasPrice'),
    latencyMs,
  }
}

/** Un seul `eth_gasPrice` — utilisé après une notification `newHeads` (WebSocket). */
export async function raylsRpcGasPriceOnly(): Promise<{
  gasPriceHex: string
  latencyMs: number
}> {
  const body = [{ jsonrpc: '2.0' as const, id: 1, method: 'eth_gasPrice', params: [] }]
  const t0 = performance.now()
  const res = await fetchWithTimeout(raylsMainnetRpcHttpUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  })
  const latencyMs = performance.now() - t0
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  const payload = (await res.json()) as
    | { id?: number; result?: string; error?: { message: string } }
    | Array<{ id?: number; result?: string; error?: { message: string } }>
  const row = Array.isArray(payload) ? payload[0] : payload
  if (!row?.result) {
    throw new Error(row?.error?.message ?? 'eth_gasPrice: missing result')
  }
  return { gasPriceHex: row.result, latencyMs }
}

export function weiToGweiDisplay(wei: bigint): string {
  const n = Number(wei)
  if (Number.isSafeInteger(n)) {
    return `${(n / 1e9).toFixed(4)} gwei`
  }
  const whole = wei / 10n ** 9n
  const frac = (wei % 10n ** 9n) * 10_000n / 10n ** 9n
  const fracStr = frac.toString().padStart(4, '0').replace(/0+$/, '')
  return fracStr.length ? `${whole.toString()}.${fracStr} gwei` : `${whole.toString()} gwei`
}
