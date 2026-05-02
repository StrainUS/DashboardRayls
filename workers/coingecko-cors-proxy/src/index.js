/**
 * Relaie GET vers l’API v3 CoinGecko avec CORS * et clé demo/pro côté Worker
 * (évite CORS / prévol OPTIONS depuis *.github.io).
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('GET/HEAD only', { status: 405, headers: cors })
    }

    const url = new URL(request.url)
    const pathname = url.pathname
    if (pathname === '/' || pathname === '') {
      return new Response('CoinGecko proxy : chemins API v3 (ex. /simple/price?ids=rayls)', {
        status: 400,
        headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    let targetBase = 'https://api.coingecko.com/api/v3'
    const headers = { Accept: 'application/json' }
    const pro = String(env.COINGECKO_PRO_API_KEY || '').trim()
    const demo = String(env.COINGECKO_DEMO_API_KEY || '').trim()
    if (pro) {
      targetBase = 'https://pro-api.coingecko.com/api/v3'
      headers['x-cg-pro-api-key'] = pro
    } else if (demo) {
      headers['x-cg-demo-api-key'] = demo
    }

    const suffix = pathname.startsWith('/') ? pathname.slice(1) : pathname
    const target = `${targetBase}/${suffix}${url.search}`

    const res = await fetch(target, { method: request.method, headers })
    const out = await res.arrayBuffer()
    const ct = res.headers.get('Content-Type') || 'application/json; charset=utf-8'
    return new Response(out, {
      status: res.status,
      headers: { ...cors, 'Content-Type': ct },
    })
  },
}
