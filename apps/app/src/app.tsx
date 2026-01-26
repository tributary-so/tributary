import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazyPaymentPolicy = lazy(() => import('@/components/payment-policy/payment-policy-feature'))
const LazyAccount = lazy(() => import('@/components/account/account-page'))
const LazyPresentation = lazy(() => import('@/components/presentation/presentation-feature'))
const LazyX402Presentation = lazy(() => import('@/components/presentation/x402-presentation-feature'))

const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  { path: 'about', element: <LazyDashboard /> },
  { path: 'demo', element: <LazyDashboard /> },
  { path: 'docs', element: <LazyDashboard /> },
  { path: 'quickstart', element: <LazyPaymentPolicy /> },
  { path: 'account', element: <LazyAccount /> },
  { path: 'hackathon', element: <LazyPresentation /> },
  { path: 'x402', element: <LazyX402Presentation /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout>{router}</AppLayout>
    </AppProviders>
  )
}
