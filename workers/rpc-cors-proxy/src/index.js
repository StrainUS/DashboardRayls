/**
 * Relaie des POST JSON-RPC vers TARGET_RPC_URL avec CORS * (GET non supporté par le RPC).
 * Déployer une 2ᵉ instance avec TARGET_RPC_URL=https://testnet-rpc.rayls.com pour la testnet.
 */
export default {
  async fetch(request, env) {
    const base = String(env.TARGET_RPC_URL || 'https://mainnet-rpc.rayls.com').replace(/\/$/, '')
    const target = `${base}/`
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
