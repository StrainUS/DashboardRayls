import { useCallback, useEffect, useRef, useState } from 'react'
import { isSafeHttpOrHttpsUrl } from '../../lib/safeUrl'
import { RAYLS_MAINNET, RAYLS_OFFICIAL } from '../../raylsConfig'
import { fetchRaylsCirculatingSupply, fetchRaylsTotalSupply } from '../../raylsOfficial'
import { fetchCgCoinDetailLite, type CoinDetailLite } from '../../raylsMarket'
import { OFFICIAL_HUB_REFRESH_MS } from '../../constants/dashboard'

type SupplyState = {
  circulating: string | null
  total: string | null
  circulatingErr: string | null
  totalErr: string | null
}

const emptySupply: SupplyState = {
  circulating: null,
  total: null,
  circulatingErr: null,
  totalErr: null,
}

export function OfficialRaylsHub() {
  const [supply, setSupply] = useState<SupplyState>(emptySupply)
  const [coin, setCoin] = useState<CoinDetailLite | null>(null)
  const [coinErr, setCoinErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hubUpdatedAt, setHubUpdatedAt] = useState<number | null>(null)
  const hubSeq = useRef(0)

  const loadHub = useCallback(async (silent = false) => {
    const seq = ++hubSeq.current
    if (!silent) setLoading(true)
    setCoinErr(null)

    try {
      const settled = await Promise.allSettled([
        fetchRaylsCirculatingSupply(),
        fetchRaylsTotalSupply(),
        fetchCgCoinDetailLite(),
      ])
      if (seq !== hubSeq.current) return

      const nextSupply: SupplyState = { ...emptySupply }
      if (settled[0].status === 'fulfilled') {
        nextSupply.circulating = settled[0].value
      } else {
        const r = settled[0].reason
        nextSupply.circulatingErr = r instanceof Error ? r.message : String(r)
      }
      if (settled[1].status === 'fulfilled') {
        nextSupply.total = settled[1].value
      } else {
        const r = settled[1].reason
        nextSupply.totalErr = r instanceof Error ? r.message : String(r)
      }
      if (settled[2].status === 'fulfilled') {
        setCoin(settled[2].value)
      } else {
        setCoin(null)
        const r = settled[2].reason
        setCoinErr(r instanceof Error ? r.message : String(r))
      }
      setSupply(nextSupply)
      setHubUpdatedAt(Date.now())
    } finally {
      if (seq === hubSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const boot = window.setTimeout(() => {
      queueMicrotask(() => {
        void loadHub(false)
      })
    }, 900)
    const id = window.setInterval(() => {
      if (document.hidden) return
      queueMicrotask(() => {
        void loadHub(true)
      })
    }, OFFICIAL_HUB_REFRESH_MS)
    return () => {
      window.clearTimeout(boot)
      hubSeq.current += 1
      window.clearInterval(id)
    }
  }, [loadHub])

  const baseLinks: { label: string; href: string }[] = [
    { label: 'Site', href: RAYLS_OFFICIAL.site },
    { label: 'Bridge / seeding', href: RAYLS_OFFICIAL.bridge },
    { label: 'Documentation', href: RAYLS_OFFICIAL.docs },
    { label: 'Blog', href: RAYLS_OFFICIAL.blog },
    { label: 'Litepaper', href: RAYLS_OFFICIAL.litepaper },
    { label: 'PoU dashboard', href: RAYLS_OFFICIAL.pouDashboard },
    { label: 'Linktree', href: RAYLS_OFFICIAL.linktree },
    { label: 'Token Ethereum (Etherscan)', href: RAYLS_OFFICIAL.etherscanToken },
    { label: 'Token BSC (BscScan)', href: RAYLS_OFFICIAL.bscscanToken },
    { label: 'CoinMarketCap', href: RAYLS_OFFICIAL.coinMarketCap },
    { label: 'Explorateur mainnet (Blockscout)', href: RAYLS_MAINNET.explorerUrl },
    { label: 'RPC mainnet (référence doc)', href: RAYLS_MAINNET.docsUrl },
  ]
  const seen = new Set(baseLinks.map((l) => l.href.toLowerCase()))
  const extra =
    coin?.links.filter((l) => {
      if (!isSafeHttpOrHttpsUrl(l.url)) return false
      const k = l.url.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }) ?? []
  const allLinks = [
    ...baseLinks,
    ...extra.map((l) => ({ label: l.title, href: l.url })),
  ]

  const supplyBanner =
    [supply.circulatingErr, supply.totalErr, coinErr].filter(Boolean).join(' · ') || null

  return (
    <section className="dash-panel dash-panel--official" aria-labelledby="official-heading">
      <div className="dash-panel-head dash-panel-head--tight">
        <h2 id="official-heading" className="dash-panel-title">
          API & liens
        </h2>
        {hubUpdatedAt != null ? (
          <span className="dash-panel-meta-muted" title="Dernier rafraîchissement">
            {new Date(hubUpdatedAt).toLocaleTimeString('fr-FR', { hour12: false })}
          </span>
        ) : null}
      </div>

      {supplyBanner && <div className="dash-alert dash-alert--warn">{supplyBanner}</div>}

      <div className="official-grid">
        <div className="card card--inset">
          <div className="label">Circulating supply</div>
          <div className="value value-sm mono">
            {loading && !supply.circulating && !supply.circulatingErr
              ? '…'
              : supply.circulating ?? '—'}
          </div>
          {supply.circulatingErr && <div className="sub err-inline">{supply.circulatingErr}</div>}
          <a className="link-quiet" href={RAYLS_OFFICIAL.circulatingSupplyApi} target="_blank" rel="noopener noreferrer">
            Endpoint →
          </a>
        </div>
        <div className="card card--inset">
          <div className="label">Total supply</div>
          <div className="value value-sm mono">
            {loading && !supply.total && !supply.totalErr ? '…' : supply.total ?? '—'}
          </div>
          {supply.totalErr && <div className="sub err-inline">{supply.totalErr}</div>}
          <a className="link-quiet" href={RAYLS_OFFICIAL.totalSupplyApi} target="_blank" rel="noopener noreferrer">
            Endpoint →
          </a>
        </div>
      </div>

      <div className="link-grid">
        {allLinks.map((l) => (
          <a key={l.href} className="official-link" href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </section>
  )
}
