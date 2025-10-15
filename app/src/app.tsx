import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazyGateway = lazy(() => import('@/components/gateway/gateway-feature'))
const LazyPaymentPolicy = lazy(() => import('@/components/payment-policy/payment-policy-feature'))
const LazyPaymentPolicyList = lazy(() => import('@/components/payment-policy/payment-policy-list'))
const LazyAccount = lazy(() => import('@/components/account/account-page'))
const LazyWidgetDemo = lazy(() => import('@/components/widget/widget-demo'))

const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  { path: 'about', element: <LazyDashboard /> },
  { path: 'demo', element: <LazyDashboard /> },
  { path: 'docs', element: <LazyDashboard /> },
  { path: 'gateway', element: <LazyGateway /> },
  { path: 'quickstart', element: <LazyPaymentPolicy /> },
  { path: 'policies', element: <LazyPaymentPolicyList /> },
  { path: 'widget-demo', element: <LazyWidgetDemo /> },
  { path: 'account', element: <LazyAccount /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout>{router}</AppLayout>
    </AppProviders>
  )
}
