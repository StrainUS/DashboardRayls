import { describe, expect, it } from 'vitest'
import { buildRpcSnapshotExportJson } from './rpcSnapshotExport'
import type { RpcLiveSnapshot } from './rpcSnapshotWire'

const snap: RpcLiveSnapshot = {
  status: 'ok',
  latencyMs: 12,
  chainIdHex: '0x11d29',
  chainIdDecimal: 72957,
  blockNumber: 1n,
  gasPriceWei: 2n,
  error: null,
  updatedAt: 1_700_000_000_000,
  syncing: { ok: true, syncing: false },
  clientVersion: 'v',
  netVersion: '1',
  latestBlock: null,
  feeNextBase: null,
  usdrTotalSupplyWei: null,
  rlsTotalSupplyWei: null,
}

describe('rpcSnapshotExport', () => {
  it('produces parseable JSON with metadata', () => {
    const raw = buildRpcSnapshotExportJson({ rpcUrl: 'https://example.com', snap, locale: 'fr-FR' })
    const o = JSON.parse(raw) as { rpcUrl: string; snapshot: { v: number }; exportedAtEpochMs: number }
    expect(o.rpcUrl).toBe('https://example.com')
    expect(o.snapshot.v).toBe(1)
    expect(typeof o.exportedAtEpochMs).toBe('number')
  })
})
