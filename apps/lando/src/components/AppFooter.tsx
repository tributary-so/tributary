import { Code2, Github, Twitter, Mail } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <span className="font-semibold uppercase tracking-[0.3em]">
                TRIBUTARY
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Automated recurring payments on Solana. Sign once, pay seamlessly.
            </p>
          </div>
          <div>
            <div className="font-medium text-sm mb-4">Resources</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/tributary-so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
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
                  href="https://sdk.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  SDK
                </a>
              </li>
              <li>
                <a
                  href="https://npmjs.com/package/@tributary-so/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  NPM Package
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-sm mb-4">Products</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://app.tributary.so"
                  className="hover:text-foreground transition-colors"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="https://checkout.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Checkout
                </a>
              </li>
              <li>
                <a
                  href="https://lando.tributary.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Lando
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground/60 mt-8 pt-8 border-t border-border/50">
          <div>&copy; 2026 Tributary. Built with &lt;3 on Solana.</div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a
              href="https://twitter.com/tributaryso"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/tributary-so"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="mailto:team@tributary.so"
              className="hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
