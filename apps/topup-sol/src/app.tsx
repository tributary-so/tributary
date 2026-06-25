import { lazy, Suspense } from "react";
import { AppProviders } from "@/components/app-providers";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

const Setup = lazy(() => import("@/pages/Setup"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground text-sm uppercase tracking-[0.12em]">
        Loading...
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background antialiased font-sans">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<LoadingFallback />}>
            <Setup />
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  );
}
