import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import { AppProviders } from '@/components/app-providers'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'

const Dashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const Account = lazy(() => import('@/components/account/account-page'))
const ReferalProgram = lazy(() => import('@/components/referral-program/ReferralProgramPage'))
const GatewaysPage = lazy(() => import('@/components/gateway/gateways-page'))
const GatewayManagePage = lazy(() => import('@/components/gateway/gateway-manage-page'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground text-sm uppercase tracking-[0.12em]">Loading...</div>
    </div>
  )
}

export function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background antialiased font-sans">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="about" element={<Dashboard />} />
              <Route path="demo" element={<Dashboard />} />
              <Route path="docs" element={<Dashboard />} />
              <Route path="account" element={<Account />} />
              <Route path="referral" element={<ReferalProgram />} />
              <Route path="gateways" element={<GatewaysPage />} />
              <Route path="gateway/manage" element={<GatewayManagePage />} />
            </Routes>
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  )
}
