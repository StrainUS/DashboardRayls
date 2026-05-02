import { useCallback, useEffect, useRef, useState } from 'react'
import { TESTNET_TELEMETRY_POLL_MS } from '../../constants/dashboard'
import { useI18n } from '../../i18n'
import { RAYLS_TESTNET, hexToBigInt } from '../../raylsConfig'
import { raylsRpcTelemetryBatch, type RaylsSyncingState } from '../../raylsRpcTelemetry'
import { weiToGweiDisplay } from '../../raylsRpc'

type TFn = (key: string, vars?: Record<string, string | number>) => string

function syncLabel(sync: RaylsSyncingState, t: TFn): string {
  if (!sync.ok) return t('testnet.syncUnknown')
  if (!sync.syncing) return t('testnet.syncSynced')
  return t('testnet.syncProgress', { hash: sync.currentBlockHex.slice(0, 12) })
}

type Snap = {
  chainIdDec: number | null
  block: bigint | null
  gasWei: bigint | null
  syncing: RaylsSyncingState
  client: string | null
  latencyMs: number | null
  err: string | null
  at: number | null
}

const empty: Snap = {
  chainIdDec: null,
  block: null,
  gasWei: null,
  syncing: { ok: false },
  client: null,
  latencyMs: null,
  err: null,
  at: null,
}

/** Même batch télémétrique que le mainnet, sans eth_call jetons — réseau test documenté. */
export function TestnetTelemetryCard() {
  const { t } = useI18n()
  const [snap, setSnap] = useState<Snap>(empty)
  const seqRef = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current
    try {
      const batch = await raylsRpcTelemetryBatch(RAYLS_TESTNET.rpcUrl)
      if (seq !== seqRef.current) return
      setSnap({
        chainIdDec: Number(hexToBigInt(batch.chainIdHex)),
        block: batch.latestBlock?.number ?? null,
        gasWei: hexToBigInt(batch.gasPriceHex),
        syncing: batch.syncing,
        client: batch.clientVersion,
        latencyMs: batch.latencyMs,
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
          {t('testnet.title', { id: RAYLS_TESTNET.expectedChainIdDecimal })}
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
          <div className="label">{t('testnet.chainMeasured')}</div>
          <div className={`value mono ${chainOk ? '' : 'err-inline'}`}>
            {snap.chainIdDec ?? '—'} {snap.chainIdDec != null ? (chainOk ? '✓' : t('testnet.expected')) : ''}
          </div>
        </div>
        <div>
          <div className="label">{t('testnet.block')}</div>
          <div className="value mono">{snap.block != null ? snap.block.toString() : '—'}</div>
        </div>
        <div>
          <div className="label">{t('testnet.gasPrice')}</div>
          <div className="value mono">{snap.gasWei != null ? weiToGweiDisplay(snap.gasWei) : '—'}</div>
        </div>
        <div>
          <div className="label">{t('testnet.batchLatency')}</div>
          <div className="value mono">
            {snap.latencyMs != null ? `${snap.latencyMs.toFixed(2)} ms` : '—'}
          </div>
        </div>
        <div>
          <div className="label">{t('testnet.syncing')}</div>
          <div className="value value-sm">{syncLabel(snap.syncing, t)}</div>
        </div>
        <div>
          <div className="label">{t('rpc.client')}</div>
          <div className="value value-sm mono">{snap.client ?? '—'}</div>
        </div>
      </div>
      <div className="dash-rpc-actions dash-rpc-actions--loose">
        <a className="link-quiet" href={RAYLS_TESTNET.explorerUrl} target="_blank" rel="noopener noreferrer">
          {t('testnet.explorer')}
        </a>
        <a className="link-quiet" href={RAYLS_TESTNET.faucetUrl} target="_blank" rel="noopener noreferrer">
          {t('testnet.faucet')}
        </a>
        <a className="link-quiet" href={RAYLS_TESTNET.docsUrl} target="_blank" rel="noopener noreferrer">
          {t('testnet.chainRef')}
        </a>
      </div>
    </section>
  )
}
