import { useCallback, useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { localeTag } from '../../i18n/translate'
import { isSafeHttpOrHttpsUrl } from '../../lib/safeUrl'
import {
  RAYLS_MAINNET,
  RAYLS_MAINNET_PROTOCOL,
  hexToBigInt,
  raylsMainnetRpcHttpUrl,
} from '../../raylsConfig'
import { weiToGweiDisplay } from '../../raylsRpc'
import { raylsRpcTelemetryBatch, type RaylsTelemetry } from '../../raylsRpcTelemetry'

const LS_KEY = 'rayls-dashboard-rpc-compare-b-url'

function loadUrlB(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveUrlB(v: string) {
  try {
    localStorage.setItem(LS_KEY, v)
  } catch {
    /* private mode */
  }
}

function chainDec(hex: string): number {
  return Number(hexToBigInt(hex))
}

function blockNum(t: RaylsTelemetry): bigint {
  return t.latestBlock?.number ?? hexToBigInt(t.blockHex)
}

type SyncLabelFn = (key: string, vars?: Record<string, string | number>) => string

function syncShort(s: RaylsTelemetry['syncing'], t: SyncLabelFn): string {
  if (!s.ok) return t('rpc.compareSyncUnknown')
  if (!s.syncing) return t('rpc.compareSyncOk')
  return t('rpc.compareSyncProgress')
}

export function RpcComparePanel() {
  const { t, locale } = useI18n()
  const loc = localeTag(locale)
  const primaryUrl = useMemo(() => raylsMainnetRpcHttpUrl(), [])
  const [urlB, setUrlB] = useState(loadUrlB)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [rowA, setRowA] = useState<RaylsTelemetry | null>(null)
  const [rowB, setRowB] = useState<RaylsTelemetry | null>(null)

  const urlBTrim = urlB.trim()
  const urlBOk =
    isSafeHttpOrHttpsUrl(urlBTrim) && urlBTrim.replace(/\/$/, '') !== primaryUrl.replace(/\/$/, '')

  const run = useCallback(async () => {
    if (!urlBOk) return
    setStatus('loading')
    setErrMsg(null)
    try {
      const [ta, tb] = await Promise.all([
        raylsRpcTelemetryBatch(primaryUrl, RAYLS_MAINNET_PROTOCOL),
        raylsRpcTelemetryBatch(urlBTrim, RAYLS_MAINNET_PROTOCOL),
      ])
      setRowA(ta)
      setRowB(tb)
      setStatus('ok')
    } catch (e) {
      setRowA(null)
      setRowB(null)
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStatus('err')
    }
  }, [primaryUrl, urlBTrim, urlBOk])

  const onBlurSave = () => {
    saveUrlB(urlBTrim)
  }

  const clearB = () => {
    setUrlB('')
    saveUrlB('')
    setRowA(null)
    setRowB(null)
    setStatus('idle')
    setErrMsg(null)
  }

  const fmtMs = (n: number) =>
    `${n.toLocaleString(loc, { minimumFractionDigits: n < 100 ? 2 : 1, maximumFractionDigits: 2 })} ms`

  const deltaMs = rowA && rowB ? rowB.latencyMs - rowA.latencyMs : null
  const deltaBlock = rowA && rowB ? blockNum(rowB) - blockNum(rowA) : null

  return (
    <section className="dash-rpc-compare" aria-labelledby="rpc-compare-heading">
      <div className="dash-rpc-compare__head">
        <h2 id="rpc-compare-heading" className="dash-rpc-compare__title">
          {t('rpc.compareTitle')}
        </h2>
        <p className="dash-rpc-compare__lead">{t('rpc.compareLead')}</p>
      </div>

      <div className="dash-rpc-compare__form">
        <label className="dash-rpc-compare__label" htmlFor="rpc-compare-b-input">
          {t('rpc.compareUrlBLabel')}
        </label>
        <input
          id="rpc-compare-b-input"
          className="dash-rpc-compare__input mono"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={urlB}
          onChange={(e) => setUrlB(e.target.value)}
          onBlur={onBlurSave}
          placeholder={RAYLS_MAINNET.rpcUrl}
        />
        <p className="dash-rpc-compare__hint mono">{t('rpc.comparePrimary', { url: primaryUrl })}</p>
        <div className="dash-rpc-compare__actions">
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            disabled={!urlBOk || status === 'loading'}
            onClick={() => void run()}
          >
            {status === 'loading' ? t('rpc.compareRunning') : t('rpc.compareMeasure')}
          </button>
          <button type="button" className="dash-btn dash-btn--ghost" onClick={clearB} disabled={status === 'loading'}>
            {t('rpc.compareClear')}
          </button>
        </div>
        {!urlBOk && urlBTrim.length > 0 ? <p className="dash-rpc-compare__warn">{t('rpc.compareErrUrl')}</p> : null}
      </div>

      {status === 'err' && errMsg ? (
        <div className="dash-alert dash-alert--err dash-rpc-compare__alert" role="alert">
          <strong>{t('rpc.compareErrRun')}</strong> — {errMsg}
        </div>
      ) : null}

      {status === 'ok' && rowA && rowB ? (
        <div className="dash-rpc-compare__table-wrap">
          <table className="dash-rpc-compare__table">
            <caption className="visually-hidden">{t('rpc.compareCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('rpc.compareColMetric')}</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">{t('rpc.compareColDelta')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('rpc.compareLatency')}</th>
                <td className="mono">{fmtMs(rowA.latencyMs)}</td>
                <td className="mono">{fmtMs(rowB.latencyMs)}</td>
                <td className="mono">{deltaMs != null ? fmtMs(deltaMs) : '—'}</td>
              </tr>
              <tr>
                <th scope="row">{t('rpc.compareChainId')}</th>
                <td className="mono">{chainDec(rowA.chainIdHex)}</td>
                <td className="mono">{chainDec(rowB.chainIdHex)}</td>
                <td className="mono">
                  {chainDec(rowA.chainIdHex) === chainDec(rowB.chainIdHex) ? '0' : (chainDec(rowB.chainIdHex) - chainDec(rowA.chainIdHex)).toString()}
                </td>
              </tr>
              <tr>
                <th scope="row">{t('rpc.compareBlock')}</th>
                <td className="mono">{blockNum(rowA).toString()}</td>
                <td className="mono">{blockNum(rowB).toString()}</td>
                <td className="mono">{deltaBlock != null ? deltaBlock.toString() : '—'}</td>
              </tr>
              <tr>
                <th scope="row">{t('rpc.compareGas')}</th>
                <td className="mono">{weiToGweiDisplay(hexToBigInt(rowA.gasPriceHex))}</td>
                <td className="mono">{weiToGweiDisplay(hexToBigInt(rowB.gasPriceHex))}</td>
                <td className="mono">—</td>
              </tr>
              <tr>
                <th scope="row">{t('rpc.compareSync')}</th>
                <td>{syncShort(rowA.syncing, t)}</td>
                <td>{syncShort(rowB.syncing, t)}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : status === 'idle' ? (
        <p className="dash-rpc-compare__idle">{t('rpc.compareIdle')}</p>
      ) : null}
    </section>
  )
}
