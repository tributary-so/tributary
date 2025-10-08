import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const links = [
  //
  { label: 'Home', path: '/' },
  { label: 'Create Gateway', path: '/gateway' },
  { label: 'Create Policy', path: '/policy' },
  { label: 'Widget Demo', path: '/widget-demo' },
]
const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazyGateway = lazy(() => import('@/components/gateway/gateway-feature'))
const LazyPaymentPolicy = lazy(() => import('@/components/payment-policy/payment-policy-feature'))
const LazyWidgetDemo = lazy(() => import('@/components/widget/widget-demo'))

const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  { path: 'gateway', element: <LazyGateway /> },
  { path: 'policy', element: <LazyPaymentPolicy /> },
  { path: 'widget-demo', element: <LazyWidgetDemo /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout links={links}>{router}</AppLayout>
    </AppProviders>
  )
}
