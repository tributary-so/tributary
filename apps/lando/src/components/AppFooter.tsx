export function AppFooter() {
  return (
    <footer className="border-t border-lando-border bg-lando-card/50 backdrop-blur-xs mt-16">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-lando-muted text-sm">
            <span className="text-lando-accent font-mono">LANDO</span> · Built
            for Colosseum Hackathon 2025
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href="https://docs.tributary.so"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-muted hover:text-lando-accent transition-colors font-mono"
            >
              [Docs]
            </a>
            <a
              href="https://sdk.tributary.so"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-muted hover:text-lando-accent transition-colors font-mono"
            >
              [SDK]
            </a>
            <a
              href="https://github.com/tributary-so"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-muted hover:text-lando-accent transition-colors font-mono"
            >
              [GitHub]
            </a>
            <a
              href="https://x.com/tributaryso"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-muted hover:text-lando-accent transition-colors font-mono"
            >
              [X]
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
