export function Header() {
  return (
    <header className="border-b border-lando-border bg-lando-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-lando-accent rounded-lg flex items-center justify-center animate-pulse-green">
              <span className="text-lando-bg font-bold text-xl">L</span>
            </div>
            <div>
              <a
                href="/"
                className="text-xl font-mono font-bold text-lando-accent"
              >
                LANDO
              </a>
              <p className="text-xs text-lando-muted">
                Agent Commerce on Solana
              </p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a
              href="/"
              className="text-lando-text hover:text-lando-accent transition-colors font-mono text-sm"
            >
              [HOME]
            </a>
            <a
              href="https://checkout.tributary.so"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-text hover:text-lando-accent transition-colors font-mono text-sm"
            >
              [CHECKOUT]
            </a>
            <a
              href="https://docs.tributary.so"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lando-text hover:text-lando-accent transition-colors font-mono text-sm"
            >
              [DOCS]
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
