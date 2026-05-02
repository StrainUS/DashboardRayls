import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n'
import { warnInsecureProductionConfig } from './lib/envGuards'
import './styles/dashboard.css'
import App from './app/App.tsx'

warnInsecureProductionConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
