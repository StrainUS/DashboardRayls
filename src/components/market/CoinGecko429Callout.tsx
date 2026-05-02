import { useI18n } from '../../i18n'

/** Bandeau structuré : cache, cadence sans clé, variables d’env (voir `market.cg429*` i18n). */
export function CoinGecko429Callout() {
  const { t } = useI18n()
  return (
    <div
      className="dash-alert dash-alert--warn dash-alert--inline dash-alert--cg429"
      role="status"
    >
      <p className="dash-alert__title">{t('market.cg429Title')}</p>
      <p className="dash-alert__text">{t('market.cg429Text')}</p>
      <ul className="dash-alert__list">
        <li>{t('market.cg429Local')}</li>
        <li>{t('market.cg429Prod')}</li>
      </ul>
    </div>
  )
}
