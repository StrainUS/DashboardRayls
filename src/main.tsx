import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { warnInsecureProductionConfig } from './lib/envGuards'
import './styles/dashboard.css'
import App from './app/App.tsx'

warnInsecureProductionConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
