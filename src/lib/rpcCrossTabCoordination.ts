import type { RpcSnapWire } from './rpcSnapshotWire'
import { isRpcSnapWire } from './rpcSnapshotWire'

export const RAYLS_RPC_COORD_CHANNEL = 'rayls-dash-rpc-coord-v1'

const COORD_MSG = 1 as const
const PRUNE_MS = 4_200
const TICK_MS = 850

type HelloMsg = { c: typeof COORD_MSG; t: 'hello'; tabId: string; rpcUrl: string; hidden: boolean }
type SnapMsg = { c: typeof COORD_MSG; t: 'snap'; tabId: string; rpcUrl: string; wire: RpcSnapWire }

type CoordMsg = HelloMsg | SnapMsg

function isCoordMsg(x: unknown): x is CoordMsg {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.c !== COORD_MSG) return false
  if (o.t === 'hello') {
    return typeof o.tabId === 'string' && typeof o.rpcUrl === 'string' && typeof o.hidden === 'boolean'
  }
  if (o.t === 'snap') {
    return (
      typeof o.tabId === 'string' &&
      typeof o.rpcUrl === 'string' &&
      isRpcSnapWire(o.wire)
    )
  }
  return false
}

type Peer = { tabId: string; rpcUrl: string; hidden: boolean; lastSeen: number }

export type RpcCoordContext = {
  channelSupported: boolean
  /** Pilote des lots HTTP + WS pour cette URL RPC */
  isLeader: boolean
  shouldPollHttp: boolean
  shouldAttachWs: boolean
  /** Onglets connus (même URL RPC), vous inclus */
  peerCount: number
}

function computeContext(
  channelSupported: boolean,
  rpcUrl: string,
  tabId: string,
  peers: Map<string, Peer>,
): RpcCoordContext {
  const hidden = document.hidden
  if (!channelSupported) {
    return {
      channelSupported: false,
      isLeader: true,
      shouldPollHttp: !hidden,
      shouldAttachWs: !hidden,
      peerCount: 1,
    }
  }

  const sameUrl = [...peers.values()].filter((p) => p.rpcUrl === rpcUrl)
  const peerCount = Math.max(1, sameUrl.length)
  const eligible = sameUrl.filter((p) => !p.hidden)

  const isLeader =
    eligible.length > 0 &&
    [...eligible].sort((a, b) => (a.tabId < b.tabId ? -1 : 1))[0]!.tabId === tabId

  const shouldPollHttp = !hidden && isLeader && eligible.length > 0
  const shouldAttachWs = !hidden && isLeader && eligible.length > 0

  return {
    channelSupported: true,
    isLeader,
    shouldPollHttp,
    shouldAttachWs,
    peerCount,
  }
}

function ctxEqual(a: RpcCoordContext, b: RpcCoordContext): boolean {
  return (
    a.channelSupported === b.channelSupported &&
    a.isLeader === b.isLeader &&
    a.shouldPollHttp === b.shouldPollHttp &&
    a.shouldAttachWs === b.shouldAttachWs &&
    a.peerCount === b.peerCount
  )
}

export function createRaylsRpcCoordinator(options: {
  rpcUrl: string
  tabId: string
  onContext: (ctx: RpcCoordContext) => void
  onRemoteSnap: (wire: RpcSnapWire) => void
}): {
  dispose: () => void
  publishSnap: (wire: RpcSnapWire) => void
} {
  const channelSupported = typeof BroadcastChannel !== 'undefined'
  const channel = channelSupported ? new BroadcastChannel(RAYLS_RPC_COORD_CHANNEL) : null

  const peers = new Map<string, Peer>()
  let lastEmitted: RpcCoordContext | null = null

  const touchSelf = () => {
    peers.set(options.tabId, {
      tabId: options.tabId,
      rpcUrl: options.rpcUrl,
      hidden: document.hidden,
      lastSeen: Date.now(),
    })
  }

  const prune = () => {
    const now = Date.now()
    for (const [id, p] of peers) {
      if (now - p.lastSeen > PRUNE_MS) peers.delete(id)
    }
  }

  const emitIfChanged = () => {
    touchSelf()
    prune()
    const next = computeContext(Boolean(channel), options.rpcUrl, options.tabId, peers)
    if (!lastEmitted || !ctxEqual(lastEmitted, next)) {
      lastEmitted = next
      options.onContext(next)
    }
  }

  const onMessage = (ev: MessageEvent) => {
    const data = ev.data
    if (!isCoordMsg(data)) return
    if (data.rpcUrl !== options.rpcUrl) return

    if (data.t === 'hello') {
      peers.set(data.tabId, {
        tabId: data.tabId,
        rpcUrl: data.rpcUrl,
        hidden: data.hidden,
        lastSeen: Date.now(),
      })
      emitIfChanged()
      return
    }

    if (data.t === 'snap') {
      if (data.tabId === options.tabId) return
      options.onRemoteSnap(data.wire)
    }
  }

  const postHello = () => {
    if (!channel) return
    const msg: HelloMsg = {
      c: COORD_MSG,
      t: 'hello',
      tabId: options.tabId,
      rpcUrl: options.rpcUrl,
      hidden: document.hidden,
    }
    channel.postMessage(msg)
  }

  const publishSnap = (wire: RpcSnapWire) => {
    if (!channel) return
    const msg: SnapMsg = {
      c: COORD_MSG,
      t: 'snap',
      tabId: options.tabId,
      rpcUrl: options.rpcUrl,
      wire,
    }
    channel.postMessage(msg)
  }

  channel?.addEventListener('message', onMessage)

  const onVis = () => {
    emitIfChanged()
    postHello()
  }
  document.addEventListener('visibilitychange', onVis)

  const tickTimer = window.setInterval(() => {
    postHello()
    emitIfChanged()
  }, TICK_MS)

  touchSelf()
  postHello()
  emitIfChanged()

  return {
    dispose: () => {
      window.clearInterval(tickTimer)
      document.removeEventListener('visibilitychange', onVis)
      channel?.removeEventListener('message', onMessage)
      channel?.close()
      peers.clear()
    },
    publishSnap,
  }
}
