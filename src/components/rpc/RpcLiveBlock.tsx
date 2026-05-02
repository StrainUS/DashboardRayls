import { useCallback, useEffect, useRef, useState } from 'react'
import { RPC_DEADLINE_CHECK_MS, RPC_POLL_INTERVAL_MS } from '../../constants/dashboard'
import { useI18n } from '../../i18n'
import { localeTag } from '../../i18n/translate'
import { RAYLS_MAINNET, RAYLS_MAINNET_PROTOCOL, RAYLS_MAINNET_WS_URL, hexToBigInt } from '../../raylsConfig'
import { weiToGweiDisplay } from '../../raylsRpc'
import {
  raylsRpcTelemetryBatch,
  type ParsedLatestBlock,
  type RaylsSyncingState,
} from '../../raylsRpcTelemetry'
import { subscribeRaylsNewHeads, type RaylsWsStatus } from '../../raylsRpcWs'
import { LatencyChartCanvas } from './LatencyChartCanvas'

type RealtimePush = { block: bigint; gas: bigint | null; at: number; seq: number }

const LAT_HISTORY_MAX = 40

type TFn = (key: string, vars?: Record<string, string | number>) => string

function fmtLatencyMs(n: number, loc: string): string {
  const a = Math.abs(n)
  const frac = a < 100 ? 2 : 1
  return `${n.toLocaleString(loc, { minimumFractionDigits: frac, maximumFractionDigits: frac })} ms`
}

function fmtPollInterval(ms: number, loc: string): string {
  if (ms >= 1000 && ms % 1000 === 0) return `${ms / 1000} s`
  if (ms >= 1000) return `${(ms / 1000).toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`
  return `${ms} ms`
}

function shortHash(h: string): string {
  if (h.length < 20) return h
  return `${h.slice(0, 10)}…${h.slice(-8)}`
}

function fmtE18(wei: bigint | null, loc: string): string {
  if (wei == null) return '—'
  const x = Number(wei) / 1e18
  if (!Number.isFinite(x) || Math.abs(x) > 1e15) return `${wei.toString()} wei`
  return x.toLocaleString(loc, { maximumFractionDigits: 8 })
}

function gasUtilPct(used: bigint, limit: bigint, loc: string): string {
  if (limit <= 0n) return '—'
  const pct = Number((used * 10000n) / limit) / 100
  return `${pct.toLocaleString(loc, { maximumFractionDigits: 2 })} %`
}

function syncLabelRpc(s: RaylsSyncingState, t: TFn): string {
  if (!s.ok) return t('rpc.syncUnknown')
  if (!s.syncing) return t('rpc.syncSynced')
  return t('rpc.syncProgress', { from: shortHash(s.currentBlockHex), to: shortHash(s.highestBlockHex) })
}

function statsFromHistory(samples: number[]): { min: number; avg: number; max: number } | null {
  if (samples.length === 0) return null
  let min = samples[0]!
  let max = samples[0]!
  let sum = 0
  for (const x of samples) {
    if (x < min) min = x
    if (x > max) max = x
    sum += x
  }
  return { min, max, avg: sum / samples.length }
}

type RpcStatus = 'idle' | 'loading' | 'ok' | 'error'

type Snapshot = {
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

const empty: Snapshot = {
  status: 'idle',
  latencyMs: null,
  chainIdHex: null,
  chainIdDecimal: null,
  blockNumber: null,
  gasPriceWei: null,
  error: null,
  updatedAt: null,
  syncing: { ok: false },
  clientVersion: null,
  netVersion: null,
  latestBlock: null,
  feeNextBase: null,
  usdrTotalSupplyWei: null,
  rlsTotalSupplyWei: null,
}

export function RpcLiveBlock() {
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
  const [rpcCopied, setRpcCopied] = useState(false)
  const [snap, setSnap] = useState<Snapshot>(empty)
  const [walletChain, setWalletChain] = useState<string | null>(null)
  const [rpcDeadline, setRpcDeadline] = useState(0)
  const [wsStatus, setWsStatus] = useState<RaylsWsStatus>(() => (RAYLS_MAINNET_WS_URL ? 'connecting' : 'off'))
  const [realtimePush, setRealtimePush] = useState<RealtimePush | null>(null)
  const deadlineRef = useRef(0)
  const rpcIntervalRef = useRef(0)
  const refreshSeq = useRef(0)
  const wsHeadSeq = useRef(0)
  const blockPaceRef = useRef<{ n: bigint; ts: number } | null>(null)
  const [interBlockSec, setInterBlockSec] = useState<number | null>(null)
  const [latencySamples, setLatencySamples] = useState<{ t: number; ms: number }[]>([])

  const copyRpcUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(RAYLS_MAINNET.rpcUrl)
      setRpcCopied(true)
      window.setTimeout(() => setRpcCopied(false), 2000)
    } catch {
      /* Clipboard API unavailable or denied */
    }
  }, [])

  const refresh = useCallback(async (userInitiated = false) => {
    const seq = ++refreshSeq.current
    setSnap((s) => {
      if (userInitiated || s.status === 'idle') {
        return { ...s, status: 'loading', error: null }
      }
      return s
    })
    try {
      const batch = await raylsRpcTelemetryBatch(RAYLS_MAINNET.rpcUrl, RAYLS_MAINNET_PROTOCOL)
      if (seq !== refreshSeq.current) return
      const chainIdDec = Number(hexToBigInt(batch.chainIdHex))
      const blockNum = batch.latestBlock?.number ?? hexToBigInt(batch.blockHex)
      if (batch.latestBlock) {
        const lb = batch.latestBlock
        const prev = blockPaceRef.current
        if (prev && lb.number === prev.n + 1n && lb.timestampUnix > prev.ts) {
          setInterBlockSec(lb.timestampUnix - prev.ts)
        }
        blockPaceRef.current = { n: lb.number, ts: lb.timestampUnix }
      }
      setLatencySamples((prev) => {
        const next = [...prev, { t: Date.now(), ms: batch.latencyMs }]
        return next.length > LAT_HISTORY_MAX ? next.slice(-LAT_HISTORY_MAX) : next
      })

      setSnap({
        status: 'ok',
        latencyMs: batch.latencyMs,
        chainIdHex: batch.chainIdHex,
        chainIdDecimal: chainIdDec,
        blockNumber: blockNum,
        gasPriceWei: hexToBigInt(batch.gasPriceHex),
        error: null,
        updatedAt: Date.now(),
        syncing: batch.syncing,
        clientVersion: batch.clientVersion,
        netVersion: batch.netVersion,
        latestBlock: batch.latestBlock,
        feeNextBase: batch.feeNextBase,
        usdrTotalSupplyWei: batch.usdrTotalSupplyWei,
        rlsTotalSupplyWei: batch.rlsTotalSupplyWei,
      })
    } catch (e) {
      if (seq !== refreshSeq.current) return
      const msg = e instanceof Error ? e.message : String(e)
      setSnap({
        ...empty,
        status: 'error',
        error: msg,
        updatedAt: Date.now(),
      })
    }
  }, [])

  useEffect(() => {
    if (rpcIntervalRef.current) return
    const t0 = Date.now()
    const d = t0 + RPC_POLL_INTERVAL_MS
    deadlineRef.current = d
    queueMicrotask(() => {
      setRpcDeadline(d)
      void refresh()
    })
    rpcIntervalRef.current = window.setInterval(() => {
      const now = Date.now()
      if (now >= deadlineRef.current) {
        const next = now + RPC_POLL_INTERVAL_MS
        deadlineRef.current = next
        setRpcDeadline(next)
        queueMicrotask(() => {
          void refresh()
        })
      }
    }, RPC_DEADLINE_CHECK_MS)
    return () => {
      window.clearInterval(rpcIntervalRef.current)
      rpcIntervalRef.current = 0
    }
  }, [refresh])

  useEffect(() => {
    if (!RAYLS_MAINNET_WS_URL) return
    return subscribeRaylsNewHeads(
      ({ blockNumber }) => {
        const seq = ++wsHeadSeq.current
        const at = Date.now()
        /** Pas d’`eth_gasPrice` séparé : le batch HTTP inclut déjà le prix du gas ; évite un RPC doublon par bloc. */
        setRealtimePush({ block: blockNumber, gas: null, at, seq })
      },
      setWsStatus,
    )
  }, [])

  useEffect(() => {
    const eth = window.ethereum
    if (!eth) return
    const sync = async () => {
      try {
        const id = (await eth.request({ method: 'eth_chainId' })) as string
        setWalletChain(id)
      } catch {
        setWalletChain(null)
      }
    }
    void sync()
    const onChain = () => void sync()
    eth.on?.('chainChanged', onChain)
    return () => {
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  const chainMatch =
    snap.chainIdDecimal !== null && snap.chainIdDecimal === RAYLS_MAINNET.expectedChainIdDecimal
  const walletMatch =
    walletChain !== null &&
    snap.chainIdHex !== null &&
    walletChain.toLowerCase() === snap.chainIdHex.toLowerCase()

  const latencyClass =
    snap.latencyMs !== null && snap.latencyMs < 800 ? 'latency-good' : 'latency-warn'

  const histStats = statsFromHistory(latencySamples.map((s) => s.ms))

  const pollAt = snap.updatedAt ?? 0
  const useWsPush = realtimePush != null && realtimePush.at > pollAt
  const blockDisplay = useWsPush && realtimePush ? realtimePush.block : snap.blockNumber
  const gasDisplay =
    useWsPush && realtimePush?.gas != null ? realtimePush.gas : snap.gasPriceWei

  const wsPill = !RAYLS_MAINNET_WS_URL
    ? ''
    : wsStatus === 'open'
      ? t('rpc.wsSuffix')
      : wsStatus === 'connecting'
        ? t('rpc.wsConnecting')
        : ''

  return (
    <section className="dash-reseau-board" aria-labelledby="rpc-heading">
      <h2 id="rpc-heading" className="visually-hidden">
        {t('rpc.heading')}
      </h2>

      <div className="dash-reseau-control">
        <div className="dash-reseau-control__status">
          <span className="dash-pill dash-pill--live">
            <span className="dash-pulse" aria-hidden />
            {t('rpc.live')} · {fmtPollInterval(RPC_POLL_INTERVAL_MS, loc)}
            {wsPill}
          </span>
          <span className="dash-reseau-control__tick mono">
            {t('rpc.nextBatch')} <RpcNextBatchCountdown deadlineMs={rpcDeadline} localeTag={loc} />
          </span>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn--primary dash-reseau-control__action"
          onClick={() => {
            const n = Date.now()
            const next = n + RPC_POLL_INTERVAL_MS
            deadlineRef.current = next
            setRpcDeadline(next)
            void refresh(true)
          }}
          disabled={snap.status === 'loading'}
        >
          {snap.status === 'loading' ? t('rpc.measuring') : t('rpc.measureNow')}
        </button>
      </div>

      <div className="dash-reseau-live" aria-label={t('rpc.liveStateAria')}>
        <p className="dash-reseau-live__eyebrow">{t('rpc.liveEyebrow')}</p>
        <div className="dash-reseau-live-metrics">
          <article
            className={`dash-reseau-kpi dash-reseau-kpi--latency dash-reseau-kpi--${latencyClass}`}
          >
            <h3 className="dash-reseau-kpi__label">{t('rpc.latency')}</h3>
            <p className={`dash-reseau-kpi__value dash-reseau-kpi__value--xl ${latencyClass}`}>
              {snap.latencyMs !== null ? fmtLatencyMs(snap.latencyMs, loc) : '—'}
            </p>
            {histStats ? (
              <p className="dash-reseau-kpi__meta">
                {t('rpc.min')} {fmtLatencyMs(histStats.min, loc)} · {t('rpc.avg')}{' '}
                {fmtLatencyMs(histStats.avg, loc)} · {t('rpc.max')} {fmtLatencyMs(histStats.max, loc)}
              </p>
            ) : (
              <p className="dash-reseau-kpi__meta">{t('rpc.samplesPending')}</p>
            )}
          </article>
          <article className="dash-reseau-kpi">
            <h3 className="dash-reseau-kpi__label">{t('rpc.block')}</h3>
            <p className="dash-reseau-kpi__value">{blockDisplay !== null ? blockDisplay.toString() : '—'}</p>
            <p className="dash-reseau-kpi__meta">{useWsPush ? t('rpc.realtimeWs') : t('rpc.batchHttp')}</p>
          </article>
          <article className="dash-reseau-kpi">
            <h3 className="dash-reseau-kpi__label">{t('rpc.gasPrice')}</h3>
            <p className="dash-reseau-kpi__value">{gasDisplay !== null ? weiToGweiDisplay(gasDisplay) : '—'}</p>
            <p className="dash-reseau-kpi__meta">eth_gasPrice</p>
          </article>
        </div>
        <div className="dash-reseau-live-context" aria-label={t('rpc.chainWalletAria')}>
          <div className="dash-reseau-context-rail">
            <div
              className={`dash-reseau-chain-pill ${snap.status === 'ok' ? (chainMatch ? 'dash-reseau-chain-pill--ok' : 'dash-reseau-chain-pill--warn') : ''}`}
            >
              <span className="dash-reseau-chain-pill__k">{t('rpc.chainMeasured')}</span>
              <span className="dash-reseau-chain-pill__v mono">
                {snap.chainIdDecimal ?? '—'}
                {snap.status === 'ok' ? (
                  <span className="dash-reseau-chain-pill__hint">
                    {chainMatch ? t('rpc.conformDoc') : t('rpc.driftDoc')}
                  </span>
                ) : null}
              </span>
            </div>
            <span className="dash-reseau-context-rail__rule" aria-hidden />
            <div className="dash-reseau-wallet-strip">
              <span className="dash-reseau-wallet-strip__k">{t('rpc.wallet')}</span>
              <span className="dash-reseau-wallet-strip__v mono">
                {!window.ethereum ? t('rpc.noProvider') : (walletChain ?? '—')}
              </span>
              <span className="dash-reseau-wallet-strip__hint">
                {walletChain && snap.chainIdHex
                  ? walletMatch
                    ? t('rpc.alignedRpc')
                    : t('rpc.notAligned')
                  : t('rpc.walletHint')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-reseau-split">
        <div className="dash-reseau-split__connect">
          <div className="dash-reseau-connect-head">
            <h3 className="dash-reseau-connect-title">{t('rpc.connectionTitle')}</h3>
            <p className="dash-reseau-connect-lead">{t('rpc.connectionLead')}</p>
          </div>
          <p className="dash-reseau-endpoint-url mono u-break-anywhere">{RAYLS_MAINNET.rpcUrl}</p>
          <div className="dash-rpc-actions">
            <button type="button" className="dash-copy-btn" onClick={() => void copyRpcUrl()}>
              {rpcCopied ? t('rpc.copied') : t('rpc.copyUrl')}
            </button>
            <a className="link-quiet" href={RAYLS_MAINNET.explorerUrl} target="_blank" rel="noopener noreferrer">
              {t('rpc.explorerLink')}
            </a>
            <a className="link-quiet" href={RAYLS_MAINNET.docsUrl} target="_blank" rel="noopener noreferrer">
              {t('rpc.chainRefLink')}
            </a>
          </div>
        </div>
        <div className="dash-reseau-split__chart">
          <div className="dash-live-chart-head dash-live-chart-head--latency">
            <span className="dash-kicker">
              {t('rpc.chartKicker')} <span className="dash-kicker-unit">{t('rpc.chartUnit')}</span>
            </span>
            <span className="dash-hint">{t('rpc.chartHint', { n: LAT_HISTORY_MAX })}</span>
          </div>
          <LatencyChartCanvas
            samples={latencySamples}
            localeTag={loc}
            emptyLabel={t('rpc.latencyChartEmpty')}
            ariaLabel={t('rpc.latencyChartAria')}
          />
          <p className="dash-caption">{t('rpc.chartCaption')}</p>
        </div>
      </div>

      {snap.status === 'ok' && (
        <div className="dash-reseau-tech">
          <h3 className="dash-reseau-tech__heading">{t('rpc.techHeading')}</h3>
          <div className="dash-reseau-detail-stack">
            <section className="dash-reseau-detail-card" aria-labelledby="reseau-node">
              <h3 id="reseau-node" className="dash-reseau-detail-card__title">
                {t('rpc.nodeSync')}
              </h3>
              <dl className="dash-reseau-dl">
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.client')}</dt>
                  <dd className="mono">{snap.clientVersion ?? '—'}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>net_version</dt>
                  <dd>{snap.netVersion ?? '—'}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>eth_syncing</dt>
                  <dd>{syncLabelRpc(snap.syncing, t)}</dd>
                </div>
              </dl>
            </section>

            <section className="dash-reseau-detail-card" aria-labelledby="reseau-block">
              <h3 id="reseau-block" className="dash-reseau-detail-card__title">
                {t('rpc.lastBlock')}
              </h3>
              <dl className="dash-reseau-dl">
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.hash')}</dt>
                  <dd className="mono">{snap.latestBlock ? shortHash(snap.latestBlock.hash) : '—'}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.tsUtc')}</dt>
                  <dd>
                    {snap.latestBlock
                      ? new Date(snap.latestBlock.timestampUnix * 1000).toLocaleString(loc, { hour12: false })
                      : '—'}
                  </dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.txs')}</dt>
                  <dd>{snap.latestBlock?.txCount ?? '—'}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.gasUsedLimit')}</dt>
                  <dd className="mono">
                    {snap.latestBlock
                      ? `${gasUtilPct(snap.latestBlock.gasUsed, snap.latestBlock.gasLimit, loc)} · ${snap.latestBlock.gasUsed.toString()} / ${snap.latestBlock.gasLimit.toString()}`
                      : '—'}
                  </dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.baseFeeBlock')}</dt>
                  <dd>
                    {snap.latestBlock?.baseFeePerGas != null
                      ? weiToGweiDisplay(snap.latestBlock.baseFeePerGas)
                      : '—'}
                  </dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.baseFeeHistory')}</dt>
                  <dd>{snap.feeNextBase != null ? weiToGweiDisplay(snap.feeNextBase) : '—'}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>{t('rpc.interBlock')}</dt>
                  <dd>{interBlockSec != null ? `${interBlockSec.toLocaleString(loc)} s` : '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="dash-reseau-detail-card" aria-labelledby="reseau-supply">
              <h3 id="reseau-supply" className="dash-reseau-detail-card__title">
                {t('rpc.totalSupply')}
              </h3>
              <dl className="dash-reseau-dl">
                <div className="dash-reseau-dl-row">
                  <dt>USDr</dt>
                  <dd className="mono">{fmtE18(snap.usdrTotalSupplyWei, loc)}</dd>
                </div>
                <div className="dash-reseau-dl-row">
                  <dt>RLS</dt>
                  <dd className="mono">{fmtE18(snap.rlsTotalSupplyWei, loc)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}

      {snap.status === 'error' && (
        <div className="dash-alert dash-alert--err" role="alert">
          <strong>{t('rpc.rpcError')}</strong> — {snap.error}
          <p className="dash-alert-sub">{t('rpc.rpcErrorSub')}</p>
        </div>
      )}
    </section>
  )
}

/** Compte à rebours : intervalle 100 ms ; resync différé quand le batch est replanifié (évite setState synchrone dans l’effet). */
function RpcNextBatchCountdown({ deadlineMs, localeTag: loc }: { deadlineMs: number; localeTag: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const align = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 100)
    return () => {
      window.clearTimeout(align)
      window.clearInterval(id)
    }
  }, [deadlineMs])
  if (deadlineMs <= 0) {
    return <strong>—</strong>
  }
  const msLeft = Math.max(0, deadlineMs - now)
  if (msLeft <= 0) {
    return <strong>…</strong>
  }
  const label =
    msLeft < 1000
      ? `${Math.ceil(msLeft)} ms`
      : `${(msLeft / 1000).toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`
  return <strong>{label}</strong>
}
