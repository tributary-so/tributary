import { Cpu } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-lando-border bg-lando-card/50 backdrop-blur-xs">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-5 w-5 text-lando-accent" />
              <span className="font-semibold uppercase tracking-[0.3em] text-lando-accent font-mono">
                LANDO
              </span>
            </div>
            <p className="text-sm text-lando-muted">
              Agent-to-agent commerce on Solana using Tributary subscriptions.
            </p>
          </div>
          <div></div>
          <div>
            <div className="font-medium text-sm mb-4 text-lando-text font-mono uppercase tracking-[0.08em]">
              Resources
            </div>
            <ul className="space-y-2 text-sm text-lando-muted">
              <li>
                <a
                  href="https://docs.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/tributary-so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="/skill.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  Lando Skill
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-sm mb-4 text-lando-text font-mono uppercase tracking-[0.08em]">
              Community
            </div>
            <ul className="space-y-2 text-sm text-lando-muted">
              <li>
                <a
                  href="https://x.com/tributaryso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  X (Twitter)
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/tributary_so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href="https://arena.colosseum.org/projects/explore/tributary-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lando-accent transition-colors"
                >
                  Colosseum
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-lando-muted/60 mt-8 font-mono">
          Built for Colosseum Hackathon 2025 · Powered by Tributary on Solana
        </div>
      </div>
    </footer>
  );
}
