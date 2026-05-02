import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useI18n } from '../i18n'
import { AppLayout } from './AppLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { LegalPage } from '../pages/LegalPage'
import { OverviewPage } from '../pages/OverviewPage'
import { ReseauPage } from '../pages/ReseauPage'

const SpotPage = lazy(() => import('../pages/SpotPage').then((m) => ({ default: m.SpotPage })))
const ChainePage = lazy(() => import('../pages/ChainePage').then((m) => ({ default: m.ChainePage })))
const ReferentielPage = lazy(() =>
  import('../pages/ReferentielPage').then((m) => ({ default: m.ReferentielPage })),
)

function RouteFallback() {
  const { t } = useI18n()
  return (
    <div className="dash-route-fallback" aria-busy="true" aria-live="polite">
      {t('common.loadingRoute')}
    </div>
  )
}

function LazyShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  return (
    <RouteErrorBoundary message={t('common.routeError')} reloadLabel={t('common.reload')}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}

function RouterBasename() {
  const raw = import.meta.env.BASE_URL ?? '/'
  const basename = raw === '/' ? '' : raw.replace(/\/$/, '')
  return basename
}

export default function App() {
  return (
    <BrowserRouter basename={RouterBasename()}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="reseau" element={<ReseauPage />} />
          <Route
            path="spot"
            element={
              <LazyShell>
                <SpotPage />
              </LazyShell>
            }
          />
          <Route
            path="chaine"
            element={
              <LazyShell>
                <ChainePage />
              </LazyShell>
            }
          />
          <Route
            path="referentiel"
            element={
              <LazyShell>
                <ReferentielPage />
              </LazyShell>
            }
          />
          <Route path="legal" element={<LegalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
