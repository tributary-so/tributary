import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import { AppProviders } from '@/components/app-providers'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'

const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'))
const LazyPaymentPolicy = lazy(() => import('@/components/payment-policy/payment-policy-feature'))
const LazyAccount = lazy(() => import('@/components/account/account-page'))
const LazyPresentation = lazy(() => import('@/components/presentation/presentation-feature'))
const LazyX402Presentation = lazy(() => import('@/components/presentation/x402-presentation-feature'))
const LazyLandoPresentation = lazy(() => import('@/components/presentation/lando-presentation-feature'))
const LazyReferralProgram = lazy(() => import('@/components/referral-program/ReferralProgramPage'))

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
              <Route index element={<LazyDashboard />} />
              <Route path="about" element={<LazyDashboard />} />
              <Route path="demo" element={<LazyDashboard />} />
              <Route path="docs" element={<LazyDashboard />} />
              <Route path="quickstart" element={<LazyPaymentPolicy />} />
              <Route path="account" element={<LazyAccount />} />
              <Route path="hackathon" element={<LazyPresentation />} />
              <Route path="x402" element={<LazyX402Presentation />} />
              <Route path="agent" element={<LazyLandoPresentation />} />
              <Route path="referral" element={<LazyReferralProgram />} />
            </Routes>
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  )
}
