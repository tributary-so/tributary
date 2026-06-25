export function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-center gap-3 text-primary mb-2">
          <img src="/logo.png" alt="Tributary" className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-[0.3em]">
            TRIBUTARY
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Composable SOL Top-up
        </h1>
        <p className="text-muted-foreground mt-2 max-w-[60ch]">
          Scaffold ready. Providers, cluster and form land in the next tasks.
        </p>
      </main>
    </div>
  );
}
