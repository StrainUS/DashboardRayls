import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { OverviewPage } from '../pages/OverviewPage'
import { ReseauPage } from '../pages/ReseauPage'

const SpotPage = lazy(() => import('../pages/SpotPage').then((m) => ({ default: m.SpotPage })))
const ChainePage = lazy(() => import('../pages/ChainePage').then((m) => ({ default: m.ChainePage })))
const ReferentielPage = lazy(() =>
  import('../pages/ReferentielPage').then((m) => ({ default: m.ReferentielPage })),
)

function RouteFallback() {
  return (
    <div className="dash-route-fallback" aria-busy="true" aria-live="polite">
      Chargement de la vue…
    </div>
  )
}

function LazyShell({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </RouteErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
