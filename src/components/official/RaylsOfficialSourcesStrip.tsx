import { useMemo } from 'react'
import { useI18n } from '../../i18n'
import { RAYLS_MAINNET, RAYLS_COINGECKO_PAGE, RAYLS_OFFICIAL, RAYLS_TESTNET } from '../../raylsConfig'

export function RaylsOfficialSourcesStrip() {
  const { t } = useI18n()

  const items = useMemo(
    () => [
      { label: t('sources.rpcMainnet'), href: RAYLS_MAINNET.rpcUrl, detail: t('sources.rpcMainnetD') },
      {
        label: t('sources.rpcTestnet'),
        href: RAYLS_TESTNET.rpcUrl,
        detail: t('sources.rpcTestnetD', { id: RAYLS_TESTNET.expectedChainIdDecimal }),
      },
      { label: t('sources.explorerMainnet'), href: RAYLS_MAINNET.explorerUrl, detail: t('sources.explorerMainnetD') },
      { label: t('sources.explorerTestnet'), href: RAYLS_TESTNET.explorerUrl, detail: t('sources.explorerTestnetD') },
      { label: t('sources.bridge'), href: RAYLS_OFFICIAL.bridge, detail: t('sources.bridgeD') },
      { label: t('sources.docsChain'), href: RAYLS_MAINNET.docsUrl, detail: t('sources.docsChainD') },
      { label: t('sources.site'), href: RAYLS_OFFICIAL.site, detail: t('sources.siteD') },
      { label: t('sources.documentation'), href: RAYLS_OFFICIAL.docs, detail: t('sources.documentationD') },
      { label: t('sources.pou'), href: RAYLS_OFFICIAL.pouDashboard, detail: t('sources.pouD') },
      { label: t('sources.circApi'), href: RAYLS_OFFICIAL.circulatingSupplyApi, detail: t('sources.circApiD') },
      { label: t('sources.totalApi'), href: RAYLS_OFFICIAL.totalSupplyApi, detail: t('sources.totalApiD') },
      { label: t('sources.cgRls'), href: RAYLS_COINGECKO_PAGE, detail: t('sources.cgRlsD') },
      { label: t('sources.cmc'), href: RAYLS_OFFICIAL.coinMarketCap, detail: t('sources.cmcD') },
      { label: t('sources.linktree'), href: RAYLS_OFFICIAL.linktree, detail: t('sources.linktreeD') },
    ],
    [t],
  )

  return (
    <section className="dash-sources" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="dash-sources-title">
        {t('sources.title')}
      </h2>
      <p className="dash-sources-lead">{t('sources.lead')}</p>
      <ul className="dash-sources-grid">
        {items.map((it) => (
          <li key={it.href} className="dash-sources-item">
            <a className="dash-sources-link" href={it.href} target="_blank" rel="noopener noreferrer">
              {it.label}
            </a>
            <span className="dash-sources-detail">{it.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
