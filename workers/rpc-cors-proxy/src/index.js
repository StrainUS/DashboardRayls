/**
 * Relaie POST JSON-RPC avec CORS * vers le RPC Rayls mainnet.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: cors })
    }

    const mainnetBase = String(env.TARGET_RPC_URL || 'https://mainnet-rpc.rayls.com').replace(/\/$/, '')
    const target = `${mainnetBase}/`

    const body = await request.arrayBuffer()
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
      body,
    })
    const out = await res.arrayBuffer()
    const ct = res.headers.get('Content-Type') || 'application/json; charset=utf-8'
    return new Response(out, {
      status: res.status,
      headers: { ...cors, 'Content-Type': ct },
    })
  },
}
