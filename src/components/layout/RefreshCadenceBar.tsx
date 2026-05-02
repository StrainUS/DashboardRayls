import {
  NEWS_AND_DOCS_REFRESH_MS,
  OFFICIAL_HUB_REFRESH_MS,
  RPC_POLL_INTERVAL_MS,
  formatPollInterval,
} from '../../constants/dashboard'
import { useI18n } from '../../i18n'
import { marketCadenceBarMessage } from '../../lib/marketCadenceCopy'

type Props =
  | { kind: 'rpc' | 'market' | 'hub' | 'news' }
  | { kind: 'custom'; label: string }

const VARIANT = {
  rpc: 'live',
  market: 'live',
  hub: 'steady',
  news: 'news',
} as const

export function RefreshCadenceBar(props: Props) {
  const { locale, t } = useI18n()

  const text =
    props.kind === 'custom'
      ? props.label
      : props.kind === 'rpc'
        ? t('cadence.rpc', { interval: formatPollInterval(RPC_POLL_INTERVAL_MS, locale) })
        : props.kind === 'market'
          ? marketCadenceBarMessage(t, locale)
          : props.kind === 'hub'
            ? t('cadence.hub', { interval: formatPollInterval(OFFICIAL_HUB_REFRESH_MS, locale) })
            : t('cadence.news', { interval: formatPollInterval(NEWS_AND_DOCS_REFRESH_MS, locale) })

  const variant = props.kind === 'custom' ? 'custom' : VARIANT[props.kind]
  const isLive = variant === 'live'
  return (
    <p
      className={`dash-cadence-bar dash-cadence-bar--${variant}`}
      role="status"
      aria-live="polite"
    >
      <span className={`dash-cadence-bar__dot${isLive ? ' dash-cadence-bar__dot--pulse' : ''}`} aria-hidden />
      <span className="dash-cadence-bar__text">{text}</span>
    </p>
  )
}
