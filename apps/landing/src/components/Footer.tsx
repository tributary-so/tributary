import { Code2, Github, Twitter, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
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
              The pull-payment primitive for Solana.
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
          <div>
            <div className="font-medium text-sm mb-4">More</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  to="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@tributary.so"
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground/60 mt-8 pt-8 border-t border-border/50">
          <div>&copy; 2026 Tributary. Built with &lt;3 on Solana.</div>
          <div className="flex gap-4 items-center mt-4 md:mt-0">
            <a
              href="https://twitter.com/tributaryso"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://t.me/tributaryso"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 48 48"
              >
                <path
                  fill="#999999"
                  d="M41.4193 7.30899C41.4193 7.30899 45.3046 5.79399 44.9808 9.47328C44.8729 10.9883 43.9016 16.2908 43.1461 22.0262L40.5559 39.0159C40.5559 39.0159 40.3401 41.5048 38.3974 41.9377C36.4547 42.3705 33.5408 40.4227 33.0011 39.9898C32.5694 39.6652 24.9068 34.7955 22.2086 32.4148C21.4531 31.7655 20.5897 30.4669 22.3165 28.9519L33.6487 18.1305C34.9438 16.8319 36.2389 13.8019 30.8426 17.4812L15.7331 27.7616C15.7331 27.7616 14.0063 28.8437 10.7686 27.8698L3.75342 25.7055C3.75342 25.7055 1.16321 24.0823 5.58815 22.459C16.3807 17.3729 29.6555 12.1786 41.4193 7.30899Z"
                />
              </svg>
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
