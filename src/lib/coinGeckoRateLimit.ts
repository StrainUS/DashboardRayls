/** Détecte un refus CoinGecko lié au quota (429 ou libellés d’erreur connus). */
export const RATE_LIMIT_RGX =
  /429|limite de débit|quota dépassé|quota exceeded|rate limit|too many requests/i

export function isCoinGeckoRateLimitMessage(message: string): boolean {
  return RATE_LIMIT_RGX.test(message)
}
