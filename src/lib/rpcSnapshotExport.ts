import type { RpcLiveSnapshot } from './rpcSnapshotWire'
import { snapshotToWire } from './rpcSnapshotWire'

export type RpcSnapshotExportPayload = {
  exportedAt: string
  exportedAtEpochMs: number
  rpcUrl: string
  locale: string
  snapshot: ReturnType<typeof snapshotToWire>
}

export function buildRpcSnapshotExportJson(args: {
  rpcUrl: string
  snap: RpcLiveSnapshot
  locale: string
}): string {
  const now = Date.now()
  const payload: RpcSnapshotExportPayload = {
    exportedAt: new Date(now).toISOString(),
    exportedAtEpochMs: now,
    rpcUrl: args.rpcUrl,
    locale: args.locale,
    snapshot: snapshotToWire(args.snap),
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}
