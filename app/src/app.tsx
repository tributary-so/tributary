import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'

const links = [
  //
  { label: 'Home', path: '/' },
  { label: 'Account', path: '/account' },
  { label: 'Create Gateway', path: '/gateway' },
]
const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazyAccountIndex = lazy(() => import('@/components/account/account-index-feature'))
const LazyAccountDetail = lazy(() => import('@/components/account/account-detail-feature'))
const LazyGateway = lazy(() => import('@/components/gateway/gateway-feature'))

const routes: RouteObject[] = [
  { index: true, element: <LazyDashboard /> },
  {
    path: 'account',
    children: [
      { index: true, element: <LazyAccountIndex /> },
      { path: ':address', element: <LazyAccountDetail /> },
    ],
  },
  { path: 'gateway', element: <LazyGateway /> },
]

export function App() {
  const router = useRoutes(routes)
  return (
    <AppProviders>
      <AppLayout links={links}>{router}</AppLayout>
    </AppProviders>
  )
}
