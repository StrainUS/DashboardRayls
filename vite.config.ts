import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Métadonnées partage / SEO : canonical, Open Graph, Twitter (désactivé si var absente). */
function socialMetaPlugin(publicOrigin: string, basePath: string): Plugin {
  const origin = publicOrigin.replace(/\/$/, '')
  return {
    name: 'rayls-social-meta',
    transformIndexHtml(html) {
      if (!origin) return html
      const canonical = `${origin}${basePath}`
      const ogImage = `${origin}${basePath}og-image.png?v=19`
      const block = `
    <link rel="canonical" href="${canonical}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:alt" content="Rayls — surveillance du réseau public" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:locale:alternate" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Rayls · Surveillance du réseau public" />
    <meta
      name="twitter:description"
      content="RPC, marché CoinGecko et liens vers la doc Rayls — application tierce, sans garantie d’exactitude."
    />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Rayls" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="Rayls" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`
      return html.replace('</head>', `${block}\n  </head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const demoKey = (env.VITE_COINGECKO_DEMO_API_KEY || '').trim()
  const proKey = (env.VITE_COINGECKO_PRO_API_KEY || '').trim()
  const usePro = proKey.length > 0
  const target = usePro ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com'

  const baseRaw = (env.VITE_BASE_PATH || '/').trim()
  const base = baseRaw.endsWith('/') ? baseRaw : `${baseRaw}/`
  const publicOrigin = (env.VITE_PUBLIC_ORIGIN || '').trim()

  return {
    base,
    plugins: [react(), socialMetaPlugin(publicOrigin, base)],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor'
            if (id.includes('node_modules/react-router')) return 'router'
          },
        },
      },
    },
    server: {
      proxy: {
        // Same-origin en dev : CORS + injection des clés (non exposées au bundle navigateur).
        '/api/coingecko': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, '/api/v3'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (usePro) proxyReq.setHeader('x-cg-pro-api-key', proKey)
              else if (demoKey) proxyReq.setHeader('x-cg-demo-api-key', demoKey)
            })
          },
        },
      },
    },
  }
})
