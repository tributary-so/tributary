import { Droplets } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="h-5 w-5 text-primary" />
              <span className="font-semibold uppercase tracking-[0.3em]">
                TRIBUTARY
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Composable pull payments on Solana. This demo configures an auto
              top-up policy that swaps USDC to SOL via Meteora.
            </p>
          </div>
          <div></div>
          <div>
            <div className="font-medium text-sm mb-4">Resources</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://docs.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/tributary-so/tributary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-sm mb-4">Community</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://x.com/tributaryso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  X (Twitter)
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/tributary_so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground/60 mt-8">
          &copy; 2026 Tributary. Built with ❤️ on Solana.
        </div>
      </div>
    </footer>
  );
}
