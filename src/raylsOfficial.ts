import { fetchWithTimeout } from './lib/fetchUtil'
import { RAYLS_OFFICIAL } from './raylsConfig'

const SUPPLY_TEXT_MAX_CHARS = 8192

/** Réponse API Rayls : nombre décimal en texte brut (cf. blog Rayls × CMC). */
export async function fetchRaylsSupplyText(url: string): Promise<string> {
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: { Accept: 'text/plain,*/*' },
    credentials: 'omit',
  })
  if (!res.ok) throw new Error(`Rayls API ${res.status}`)
  const t = (await res.text()).trim()
  if (!t) throw new Error('Réponse vide')
  if (t.length > SUPPLY_TEXT_MAX_CHARS) throw new Error('Réponse api.rayls.com trop volumineuse')
  return t
}

export async function fetchRaylsCirculatingSupply(): Promise<string> {
  return fetchRaylsSupplyText(RAYLS_OFFICIAL.circulatingSupplyApi)
}

export async function fetchRaylsTotalSupply(): Promise<string> {
  return fetchRaylsSupplyText(RAYLS_OFFICIAL.totalSupplyApi)
}
