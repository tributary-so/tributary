import { lazy, Suspense } from "react";
import { Navbar, Footer } from "@tributary-so/ui";
import { WalletButton, ClusterUiSelect } from "@tributary-so/ui/solana";
import { AppProviders } from "@/components/app-providers";

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
        <Navbar
          items={[{ label: "Docs", href: "https://docs.tributary.so", external: true }]}
          actions={
            <>
              <WalletButton />
              <ClusterUiSelect />
            </>
          }
        />
        <main className="mx-auto max-w-5xl px-4">
          <Suspense fallback={<LoadingFallback />}>
            <Setup />
          </Suspense>
        </main>
        <Footer tagline="Composable pull payments on Solana. This demo configures an auto top-up policy that swaps USDC to SOL via Meteora." />
      </div>
    </AppProviders>
  );
}
