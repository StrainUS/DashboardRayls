import type { ParsedLatestBlock, RaylsSyncingState } from '../raylsRpcTelemetry'

export const RPC_SNAP_WIRE_VERSION = 1 as const

export type RpcStatus = 'idle' | 'loading' | 'ok' | 'error'

export type RpcSnapWire = {
  v: typeof RPC_SNAP_WIRE_VERSION
  status: RpcStatus
  latencyMs: number | null
  chainIdHex: string | null
  chainIdDecimal: number | null
  blockNumber: string | null
  gasPriceWei: string | null
  error: string | null
  updatedAt: number | null
  syncing: RaylsSyncingState
  clientVersion: string | null
  netVersion: string | null
  latestBlock: RpcLatestBlockWire | null
  feeNextBase: string | null
  usdrTotalSupplyWei: string | null
  rlsTotalSupplyWei: string | null
}

export type RpcLatestBlockWire = {
  number: string
  hash: string
  timestampUnix: number
  gasUsed: string
  gasLimit: string
  txCount: number
  baseFeePerGas: string | null
}

function blockToWire(b: ParsedLatestBlock): RpcLatestBlockWire {
  return {
    number: b.number.toString(),
    hash: b.hash,
    timestampUnix: b.timestampUnix,
    gasUsed: b.gasUsed.toString(),
    gasLimit: b.gasLimit.toString(),
    txCount: b.txCount,
    baseFeePerGas: b.baseFeePerGas == null ? null : b.baseFeePerGas.toString(),
  }
}

function blockFromWire(w: RpcLatestBlockWire): ParsedLatestBlock {
  return {
    number: BigInt(w.number),
    hash: w.hash,
    timestampUnix: w.timestampUnix,
    gasUsed: BigInt(w.gasUsed),
    gasLimit: BigInt(w.gasLimit),
    txCount: w.txCount,
    baseFeePerGas: w.baseFeePerGas == null ? null : BigInt(w.baseFeePerGas),
  }
}

export type RpcLiveSnapshot = {
  status: RpcStatus
  latencyMs: number | null
  chainIdHex: string | null
  chainIdDecimal: number | null
  blockNumber: bigint | null
  gasPriceWei: bigint | null
  error: string | null
  updatedAt: number | null
  syncing: RaylsSyncingState
  clientVersion: string | null
  netVersion: string | null
  latestBlock: ParsedLatestBlock | null
  feeNextBase: bigint | null
  usdrTotalSupplyWei: bigint | null
  rlsTotalSupplyWei: bigint | null
}

export function snapshotToWire(s: RpcLiveSnapshot): RpcSnapWire {
  return {
    v: RPC_SNAP_WIRE_VERSION,
    status: s.status,
    latencyMs: s.latencyMs,
    chainIdHex: s.chainIdHex,
    chainIdDecimal: s.chainIdDecimal,
    blockNumber: s.blockNumber == null ? null : s.blockNumber.toString(),
    gasPriceWei: s.gasPriceWei == null ? null : s.gasPriceWei.toString(),
    error: s.error,
    updatedAt: s.updatedAt,
    syncing: s.syncing,
    clientVersion: s.clientVersion,
    netVersion: s.netVersion,
    latestBlock: s.latestBlock ? blockToWire(s.latestBlock) : null,
    feeNextBase: s.feeNextBase == null ? null : s.feeNextBase.toString(),
    usdrTotalSupplyWei: s.usdrTotalSupplyWei == null ? null : s.usdrTotalSupplyWei.toString(),
    rlsTotalSupplyWei: s.rlsTotalSupplyWei == null ? null : s.rlsTotalSupplyWei.toString(),
  }
}

export function wireToSnapshot(w: RpcSnapWire): RpcLiveSnapshot {
  return {
    status: w.status,
    latencyMs: w.latencyMs,
    chainIdHex: w.chainIdHex,
    chainIdDecimal: w.chainIdDecimal,
    blockNumber: w.blockNumber == null ? null : BigInt(w.blockNumber),
    gasPriceWei: w.gasPriceWei == null ? null : BigInt(w.gasPriceWei),
    error: w.error,
    updatedAt: w.updatedAt,
    syncing: w.syncing,
    clientVersion: w.clientVersion,
    netVersion: w.netVersion,
    latestBlock: w.latestBlock ? blockFromWire(w.latestBlock) : null,
    feeNextBase: w.feeNextBase == null ? null : BigInt(w.feeNextBase),
    usdrTotalSupplyWei: w.usdrTotalSupplyWei == null ? null : BigInt(w.usdrTotalSupplyWei),
    rlsTotalSupplyWei: w.rlsTotalSupplyWei == null ? null : BigInt(w.rlsTotalSupplyWei),
  }
}

export function isRpcSnapWire(x: unknown): x is RpcSnapWire {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== RPC_SNAP_WIRE_VERSION) return false
  if (typeof o.status !== 'string') return false
  return o.status === 'idle' || o.status === 'loading' || o.status === 'ok' || o.status === 'error'
}
