import { describe, expect, it } from 'vitest'
import { snapshotToWire, wireToSnapshot, type RpcLiveSnapshot } from './rpcSnapshotWire'

const sample: RpcLiveSnapshot = {
  status: 'ok',
  latencyMs: 42.5,
  chainIdHex: '0x11d29',
  chainIdDecimal: 72957,
  blockNumber: 12_345n,
  gasPriceWei: 99n,
  error: null,
  updatedAt: 1_700_000_000_000,
  syncing: { ok: true, syncing: false },
  clientVersion: 'test/v1',
  netVersion: '1',
  latestBlock: {
    number: 12_345n,
    hash: '0xabc',
    timestampUnix: 1_700_000_000,
    gasUsed: 21_000n,
    gasLimit: 30_000_000n,
    txCount: 2,
    baseFeePerGas: 7n,
  },
  feeNextBase: 8n,
  usdrTotalSupplyWei: 10n ** 24n,
  rlsTotalSupplyWei: 10n ** 22n,
}

describe('rpcSnapshotWire', () => {
  it('roundtrips bigint fields', () => {
    const w = snapshotToWire(sample)
    const back = wireToSnapshot(w)
    expect(back.status).toBe(sample.status)
    expect(back.blockNumber).toBe(sample.blockNumber)
    expect(back.gasPriceWei).toBe(sample.gasPriceWei)
    expect(back.latestBlock?.number).toBe(sample.latestBlock?.number)
    expect(back.latestBlock?.baseFeePerGas).toBe(sample.latestBlock?.baseFeePerGas)
    expect(back.usdrTotalSupplyWei).toBe(sample.usdrTotalSupplyWei)
    expect(back.rlsTotalSupplyWei).toBe(sample.rlsTotalSupplyWei)
    expect(back.feeNextBase).toBe(sample.feeNextBase)
  })
})
