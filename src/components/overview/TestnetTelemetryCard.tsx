import { useCallback, useEffect, useRef, useState } from 'react'
import { TESTNET_TELEMETRY_POLL_MS } from '../../constants/dashboard'
import { RAYLS_TESTNET, hexToBigInt } from '../../raylsConfig'
import { raylsRpcTelemetryBatch } from '../../raylsRpcTelemetry'
import { weiToGweiDisplay } from '../../raylsRpc'

type Snap = {
  chainIdDec: number | null
  block: bigint | null
  gasWei: bigint | null
  syncingLabel: string
  client: string | null
  latencyMs: number | null
  err: string | null
  at: number | null
}

const empty: Snap = {
  chainIdDec: null,
  block: null,
  gasWei: null,
  syncingLabel: '—',
  client: null,
  latencyMs: null,
  err: null,
  at: null,
}

/** Même batch télémétrique que le mainnet, sans eth_call jetons — réseau test documenté. */
export function TestnetTelemetryCard() {
  const [snap, setSnap] = useState<Snap>(empty)
  const seqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current
    try {
      const t = await raylsRpcTelemetryBatch(RAYLS_TESTNET.rpcUrl)
      if (seq !== seqRef.current) return
      const syncLbl =
        !t.syncing.ok
          ? 'inconnu'
          : t.syncing.syncing
            ? `en cours · ${t.syncing.currentBlockHex.slice(0, 12)}…`
            : 'synchronisé'
      setSnap({
        chainIdDec: Number(hexToBigInt(t.chainIdHex)),
        block: t.latestBlock?.number ?? null,
        gasWei: hexToBigInt(t.gasPriceHex),
        syncingLabel: syncLbl,
        client: t.clientVersion,
        latencyMs: t.latencyMs,
        err: null,
        at: Date.now(),
      })
    } catch (e) {
      if (seq !== seqRef.current) return
      setSnap({
        ...empty,
        err: e instanceof Error ? e.message : String(e),
        at: Date.now(),
      })
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refresh()
    })
    const id = window.setInterval(() => {
      if (document.hidden) return
      void refresh()
    }, TESTNET_TELEMETRY_POLL_MS)
    return () => {
      seqRef.current += 1
      clearInterval(id)
    }
  }, [refresh])

  const chainOk = snap.chainIdDec === RAYLS_TESTNET.expectedChainIdDecimal

  return (
    <section className="dash-panel dash-panel--testnet" aria-labelledby="testnet-heading">
      <div className="dash-panel-head dash-panel-head--tight">
        <h2 id="testnet-heading" className="dash-panel-title">
          Testnet · chain {RAYLS_TESTNET.expectedChainIdDecimal}
        </h2>
        <span className="dash-panel-meta-muted mono">{RAYLS_TESTNET.rpcUrl}</span>
      </div>
      {snap.err && (
        <div className="dash-alert dash-alert--warn" role="status">
          {snap.err}
        </div>
      )}
      <div className="testnet-metric-grid">
        <div>
          <div className="label">Chain ID mesuré</div>
          <div className={`value mono ${chainOk ? '' : 'err-inline'}`}>
            {snap.chainIdDec ?? '—'} {snap.chainIdDec != null ? (chainOk ? '✓' : '≠ attendu') : ''}
          </div>
        </div>
        <div>
          <div className="label">Bloc (getBlock)</div>
          <div className="value mono">{snap.block != null ? snap.block.toString() : '—'}</div>
        </div>
        <div>
          <div className="label">Gas price</div>
          <div className="value mono">{snap.gasWei != null ? weiToGweiDisplay(snap.gasWei) : '—'}</div>
        </div>
        <div>
          <div className="label">Latence batch</div>
          <div className="value mono">
            {snap.latencyMs != null ? `${snap.latencyMs.toFixed(2)} ms` : '—'}
          </div>
        </div>
        <div>
          <div className="label">eth_syncing</div>
          <div className="value value-sm">{snap.syncingLabel}</div>
        </div>
        <div>
          <div className="label">Client</div>
          <div className="value value-sm mono">{snap.client ?? '—'}</div>
        </div>
      </div>
      <div className="dash-rpc-actions dash-rpc-actions--loose">
        <a className="link-quiet" href={RAYLS_TESTNET.explorerUrl} target="_blank" rel="noopener noreferrer">
          Explorateur testnet →
        </a>
        <a className="link-quiet" href={RAYLS_TESTNET.faucetUrl} target="_blank" rel="noopener noreferrer">
          Faucet →
        </a>
        <a className="link-quiet" href={RAYLS_TESTNET.docsUrl} target="_blank" rel="noopener noreferrer">
          Référence réseau →
        </a>
      </div>
    </section>
  )
}
