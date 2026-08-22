import { Routes, Route } from 'react-router'
import { lazy, Suspense } from 'react'
import { Navbar, Footer } from '@tributary-so/ui'
import { WalletButton, ClusterUiSelect } from '@tributary-so/ui/solana'
import { AppProviders } from '@/components/app-providers'

const CreatePolicy = lazy(() => import('@/components/create-policy'))
const Success = lazy(() => import('@/pages/Success'))

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
        <Navbar
          items={[{ label: 'Docs', href: 'https://docs.tributary.so', external: true }]}
          actions={
            <>
              <WalletButton />
              <ClusterUiSelect />
            </>
          }
        />
        <main className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route index element={<CreatePolicy />} />
              <Route path="/success" element={<Success />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </AppProviders>
  )
}
