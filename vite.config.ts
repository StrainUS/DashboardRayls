import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const demoKey = (env.VITE_COINGECKO_DEMO_API_KEY || '').trim()
  const proKey = (env.VITE_COINGECKO_PRO_API_KEY || '').trim()
  const usePro = proKey.length > 0
  const target = usePro ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com'

  const baseRaw = (env.VITE_BASE_PATH || '/').trim()
  const base = baseRaw.endsWith('/') ? baseRaw : `${baseRaw}/`

  return {
    base,
    plugins: [react()],
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
