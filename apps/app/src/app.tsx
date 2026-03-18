import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import { AppProviders } from '@/components/app-providers'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'

const Dashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const QuickStart = lazy(() => import('@/components/payment-policy/payment-policy-feature'))
const Account = lazy(() => import('@/components/account/account-page'))
const HackathonCypherpunk = lazy(() => import('@/components/presentation/presentation-feature'))
const HackathonX402 = lazy(() => import('@/components/presentation/x402-presentation-feature'))
const HackathonLando = lazy(() => import('@/components/presentation/lando-presentation-feature'))
const ReferalProgram = lazy(() => import('@/components/referral-program/ReferralProgramPage'))

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
              <Route path="quickstart" element={<QuickStart />} />
              <Route path="account" element={<Account />} />
              <Route path="hackathon" element={<HackathonCypherpunk />} />
              <Route path="x402" element={<HackathonX402 />} />
              <Route path="agent" element={<HackathonLando />} />
              <Route path="referral" element={<ReferalProgram />} />
            </Routes>
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  )
}
