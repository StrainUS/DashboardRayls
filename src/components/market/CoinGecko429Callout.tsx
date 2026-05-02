import { useI18n } from '../../i18n'

/** Bandeau compact : le suivi RPC/réseau reste indépendant ; marché optionnel via clé ou proxy. */
export function CoinGecko429Callout() {
  const { t } = useI18n()
  return (
    <div
      className="dash-alert dash-alert--warn dash-alert--inline dash-alert--cg429"
      role="status"
    >
      <p className="dash-alert__title">{t('market.cg429Title')}</p>
      <p className="dash-alert__text">{t('market.cg429Compact')}</p>
    </div>
  )
}
