import { LIVE_SPOT_INTERVAL_MS, formatPollInterval } from '../constants/dashboard'
import type { Locale } from '../i18n/types'
import { mexcSpotStreamEnabled } from './mexcSpotStream'

type TFn = (key: string, vars?: Record<string, string | number>) => string

/** Texte de la barre de cadence « marché » (Spot, vue d’ensemble). */
export function marketCadenceBarMessage(t: TFn, locale: Locale): string {
  const cg = formatPollInterval(LIVE_SPOT_INTERVAL_MS, locale)
  if (mexcSpotStreamEnabled()) {
    return t('cadence.market.withMexc', { interval: cg })
  }
  return t('cadence.market.cgOnly', { interval: cg })
}

/** Sous-titre court page Spot. */
export function spotPageLeadText(t: TFn): string {
  if (mexcSpotStreamEnabled()) {
    return t('spot.lead.mexc')
  }
  return t('spot.lead.cg')
}
