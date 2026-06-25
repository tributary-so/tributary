import { AppProviders } from "@/components/app-providers";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

export function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background antialiased font-sans">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4">
          <div className="py-16">
            <div className="flex items-center gap-3 text-primary mb-3">
              <img src="/logo.png" alt="Tributary" className="h-4 w-4" />
              <span className="font-semibold text-xs uppercase tracking-[0.3em]">
                TRIBUTARY
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Composable SOL Top-up
            </h1>
            <p className="text-muted-foreground mt-2 max-w-[60ch]">
              Providers, cluster and wallet are wired. The configuration form
              lands next.
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    </AppProviders>
  );
}
