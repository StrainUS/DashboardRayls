import {
  NEWS_AND_DOCS_REFRESH_MS,
  OFFICIAL_HUB_REFRESH_MS,
  RPC_POLL_INTERVAL_MS,
  TESTNET_TELEMETRY_POLL_MS,
  formatPollIntervalFr,
} from '../../constants/dashboard'
import { marketCadenceBarMessage } from '../../lib/marketCadenceCopy'

type Props =
  | { kind: 'rpc' | 'market' | 'hub' | 'news' | 'testnet' }
  | { kind: 'custom'; label: string }

function messageFor(props: Props): string {
  if (props.kind === 'custom') return props.label
  if (props.kind === 'rpc') {
    return `Temps réel · batch HTTP ${formatPollIntervalFr(RPC_POLL_INTERVAL_MS)} · blocs poussés en WebSocket si le endpoint l’expose`
  }
  if (props.kind === 'market') {
    return marketCadenceBarMessage()
  }
  if (props.kind === 'hub') {
    return `Rythme modéré · endpoints api.rayls.com ${formatPollIntervalFr(OFFICIAL_HUB_REFRESH_MS)}`
  }
  if (props.kind === 'news') {
    return `Actualités · re-fetch ${formatPollIntervalFr(NEWS_AND_DOCS_REFRESH_MS)} si un flux JSON est configuré`
  }
  return `Testnet · télémétrie ${formatPollIntervalFr(TESTNET_TELEMETRY_POLL_MS)}`
}

const VARIANT = {
  rpc: 'live',
  market: 'live',
  hub: 'steady',
  news: 'news',
  testnet: 'steady',
} as const

export function RefreshCadenceBar(props: Props) {
  const variant = props.kind === 'custom' ? 'custom' : VARIANT[props.kind]
  const isLive = variant === 'live'
  return (
    <p
      className={`dash-cadence-bar dash-cadence-bar--${variant}`}
      role="status"
      aria-live="polite"
    >
      <span className={`dash-cadence-bar__dot${isLive ? ' dash-cadence-bar__dot--pulse' : ''}`} aria-hidden />
      <span className="dash-cadence-bar__text">{messageFor(props)}</span>
    </p>
  )
}
