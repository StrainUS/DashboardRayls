import { fetchWithTimeout } from './lib/fetchUtil'
import { hexToBigInt } from './raylsConfig'

const ERC20_TOTAL_SUPPLY = '0x18160ddd'

export type ParsedLatestBlock = {
  number: bigint
  hash: string
  timestampUnix: number
  gasUsed: bigint
  gasLimit: bigint
  txCount: number
  baseFeePerGas: bigint | null
}

export type RaylsSyncingState =
  | { ok: true; syncing: false }
  | { ok: true; syncing: true; currentBlockHex: string; highestBlockHex: string }
  | { ok: false; reason?: string }

export type RaylsTelemetry = {
  chainIdHex: string
  blockHex: string
  gasPriceHex: string
  latencyMs: number
  syncing: RaylsSyncingState
  clientVersion: string | null
  netVersion: string | null
  latestBlock: ParsedLatestBlock | null
  feeNextBase: bigint | null
  usdrTotalSupplyWei: bigint | null
  rlsTotalSupplyWei: bigint | null
}

type BatchRow = {
  id: number
  result?: unknown
  error?: { message: string }
}

function parseSyncing(r: unknown): RaylsSyncingState {
  if (r === false) return { ok: true, syncing: false }
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>
    const cur = o.currentBlock
    const high = o.highestBlock
    if (typeof cur === 'string' && typeof high === 'string') {
      return { ok: true, syncing: true, currentBlockHex: cur, highestBlockHex: high }
    }
    return { ok: false, reason: 'Format eth_syncing inattendu' }
  }
  return { ok: false, reason: 'eth_syncing indisponible' }
}

function parseLatestBlock(raw: unknown): ParsedLatestBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const num = o.number
  const hash = o.hash
  const ts = o.timestamp
  if (typeof num !== 'string' || typeof hash !== 'string' || typeof ts !== 'string') return null
  try {
    const number = hexToBigInt(num)
    const timestampUnix = Number(hexToBigInt(ts))
    const gasUsed = typeof o.gasUsed === 'string' ? hexToBigInt(o.gasUsed) : 0n
    const gasLimit = typeof o.gasLimit === 'string' ? hexToBigInt(o.gasLimit) : 0n
    const txs = o.transactions
    const txCount = Array.isArray(txs) ? txs.length : 0
    let baseFeePerGas: bigint | null = null
    if (typeof o.baseFeePerGas === 'string') {
      baseFeePerGas = hexToBigInt(o.baseFeePerGas)
    }
    return { number, hash, timestampUnix, gasUsed, gasLimit, txCount, baseFeePerGas }
  } catch {
    return null
  }
}

function parseFeeNextBase(raw: unknown): bigint | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { baseFeePerGas?: unknown }
  const arr = o.baseFeePerGas
  if (!Array.isArray(arr) || arr.length === 0) return null
  const last = arr[arr.length - 1]
  if (typeof last !== 'string') return null
  try {
    return hexToBigInt(last)
  } catch {
    return null
  }
}

function decodeUintCall(r: unknown): bigint | null {
  if (typeof r !== 'string' || !r.startsWith('0x')) return null
  const hex = r.slice(2)
  if (hex.length === 0) return null
  try {
    return BigInt(`0x${hex}`)
  } catch {
    return null
  }
}

/**
 * Batch JSON-RPC : métriques chaîne + nœud + bloc courant + fee history + totalSupply on-chain (tokens doc Rayls).
 * `tokenContracts` absent → pas d’eth_call (RPC minimal ou vue sans jetons).
 */
export async function raylsRpcTelemetryBatch(
  rpcUrl: string,
  tokenContracts?: { usdr: string; rls: string },
): Promise<RaylsTelemetry> {
  const includeTokens = Boolean(tokenContracts)
  const usdr = tokenContracts?.usdr.toLowerCase()
  const rls = tokenContracts?.rls.toLowerCase()

  const baseCalls: Array<Record<string, unknown>> = [
    { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
    { jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] },
    { jsonrpc: '2.0', id: 3, method: 'eth_gasPrice', params: [] },
    { jsonrpc: '2.0', id: 4, method: 'eth_syncing', params: [] },
    { jsonrpc: '2.0', id: 5, method: 'web3_clientVersion', params: [] },
    { jsonrpc: '2.0', id: 6, method: 'net_version', params: [] },
    { jsonrpc: '2.0', id: 7, method: 'eth_getBlockByNumber', params: ['latest', false] },
    { jsonrpc: '2.0', id: 8, method: 'eth_feeHistory', params: ['0x4', 'latest', [25, 75]] },
  ]

  const tokenCalls: Array<Record<string, unknown>> =
    includeTokens && usdr && rls
      ? [
          {
            jsonrpc: '2.0',
            id: 9,
            method: 'eth_call',
            params: [{ to: usdr, data: ERC20_TOTAL_SUPPLY }, 'latest'],
          },
          {
            jsonrpc: '2.0',
            id: 10,
            method: 'eth_call',
            params: [{ to: rls, data: ERC20_TOTAL_SUPPLY }, 'latest'],
          },
        ]
      : []

  const body = [...baseCalls, ...tokenCalls]
  const t0 = performance.now()
  const res = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  })
  const latencyMs = performance.now() - t0
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  const arr = (await res.json()) as BatchRow[]
  const byId = new Map(arr.map((x) => [x.id, x]))

  const pickReq = (id: number, label: string): string => {
    const row = byId.get(id)
    if (row?.error) {
      throw new Error(row.error.message ?? label)
    }
    const r = row?.result
    if (typeof r !== 'string') {
      throw new Error(`${label}: résultat manquant`)
    }
    return r
  }

  const pickOptStr = (id: number): string | null => {
    const row = byId.get(id)
    if (row?.error || row?.result === undefined) return null
    return typeof row.result === 'string' ? row.result : null
  }

  const pickOpt = (id: number): unknown => {
    const row = byId.get(id)
    if (row?.error || row?.result === undefined) return undefined
    return row.result
  }

  const chainIdHex = pickReq(1, 'eth_chainId')
  const blockHex = pickReq(2, 'eth_blockNumber')
  const gasPriceHex = pickReq(3, 'eth_gasPrice')

  const syncRaw = pickOpt(4)
  const syncing = syncRaw !== undefined ? parseSyncing(syncRaw) : { ok: false as const, reason: 'eth_syncing absent' }

  const clientVersion = pickOptStr(5)
  const netVersion = pickOptStr(6)

  const blockRaw = pickOpt(7)
  const latestBlock = blockRaw !== undefined ? parseLatestBlock(blockRaw) : null

  const feeRaw = pickOpt(8)
  const feeNextBase = feeRaw !== undefined ? parseFeeNextBase(feeRaw) : null

  const usdrTotalSupplyWei = includeTokens ? decodeUintCall(pickOpt(9)) : null
  const rlsTotalSupplyWei = includeTokens ? decodeUintCall(pickOpt(10)) : null

  return {
    chainIdHex,
    blockHex,
    gasPriceHex,
    latencyMs,
    syncing,
    clientVersion,
    netVersion,
    latestBlock,
    feeNextBase,
    usdrTotalSupplyWei,
    rlsTotalSupplyWei,
  }
}
