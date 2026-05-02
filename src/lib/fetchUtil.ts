const DEFAULT_TIMEOUT_MS = 28_000
const MIN_TIMEOUT_MS = 5_000
const MAX_TIMEOUT_MS = 120_000

function envTimeoutMs(): number {
  const n = Number((import.meta.env as Record<string, string | undefined>).VITE_FETCH_TIMEOUT_MS)
  if (Number.isFinite(n) && n >= MIN_TIMEOUT_MS && n <= MAX_TIMEOUT_MS) return Math.floor(n)
  return DEFAULT_TIMEOUT_MS
}

/**
 * `fetch` avec coupe-circuit — évite des requêtes pendantes (onglet bloqué, RPC lent).
 */
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const timeoutMs = envTimeoutMs()
  const controller = new AbortController()
  const tid = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(
        `Délai dépassé (${Math.round(timeoutMs / 1000)} s). Réessayez ou vérifiez le réseau.`,
        { cause: e },
      )
    }
    throw e
  } finally {
    window.clearTimeout(tid)
  }
}
