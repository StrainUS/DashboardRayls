import { useCallback, useEffect, useRef, useState } from 'react'
import { createRaylsRpcCoordinator, type RpcCoordContext } from '../lib/rpcCrossTabCoordination'
import type { RpcSnapWire } from '../lib/rpcSnapshotWire'

function stableTabId(): string {
  try {
    const k = 'rayls-coord-tab-id'
    const existing = sessionStorage.getItem(k)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(k, id)
    return id
  } catch {
    return `tab-${Math.random().toString(36).slice(2)}`
  }
}

export function useRaylsRpcCoordination(
  rpcUrl: string,
  onRemoteSnap: (wire: RpcSnapWire) => void,
): {
  ctx: RpcCoordContext
  publishSnap: (wire: RpcSnapWire) => void
} {
  const [ctx, setCtx] = useState<RpcCoordContext>(() => ({
    channelSupported: typeof BroadcastChannel !== 'undefined',
    isLeader: true,
    shouldPollHttp: typeof document !== 'undefined' ? !document.hidden : true,
    shouldAttachWs: typeof document !== 'undefined' ? !document.hidden : true,
    peerCount: 1,
  }))

  const tabIdRef = useRef<string>(stableTabId())
  const remoteRef = useRef(onRemoteSnap)

  const publishRef = useRef<(w: RpcSnapWire) => void>(() => {})

  useEffect(() => {
    remoteRef.current = onRemoteSnap
  }, [onRemoteSnap])

  useEffect(() => {
    const coord = createRaylsRpcCoordinator({
      rpcUrl,
      tabId: tabIdRef.current,
      onContext: setCtx,
      onRemoteSnap: (wire) => {
        remoteRef.current(wire)
      },
    })
    publishRef.current = coord.publishSnap
    return () => {
      publishRef.current = () => {}
      coord.dispose()
    }
  }, [rpcUrl])

  const publishSnap = useCallback((wire: RpcSnapWire) => {
    publishRef.current(wire)
  }, [])

  return { ctx, publishSnap }
}
