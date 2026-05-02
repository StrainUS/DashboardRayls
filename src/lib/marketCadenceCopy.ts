import { LIVE_SPOT_INTERVAL_MS, formatPollIntervalFr } from '../constants/dashboard'
import { mexcSpotStreamEnabled } from './mexcSpotStream'

/** Texte de la barre de cadence « marché » (Spot, vue d’ensemble). */
export function marketCadenceBarMessage(): string {
  const cg = formatPollIntervalFr(LIVE_SPOT_INTERVAL_MS)
  if (mexcSpotStreamEnabled()) {
    return `Temps réel marché · spot USD MEXC (WebSocket) + CoinGecko ${cg} pour EUR, historique et agrégats (quota API)`
  }
  return `Temps réel marché · spot CoinGecko ${cg} (ajustable, sous quota API)`
}

/** Sous-titre court page Spot. */
export function spotPageLeadText(): string {
  if (mexcSpotStreamEnabled()) {
    return 'Courbe principale, spot USD (MEXC) complété par CoinGecko (EUR, historique, agrégats).'
  }
  return 'Courbe principale, puis spot, indicateurs et agrégats CoinGecko.'
}
