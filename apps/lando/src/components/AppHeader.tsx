import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun } from "lucide-react";

const navItems = [
  { label: "Checkout", href: "https://checkout.tributary.so" },
  { label: "Docs", href: "https://docs.tributary.so" },
  { label: "Main App", href: "https://tributary.so" },
];

export function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="border-b border-lando-border bg-lando-card/50 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex items-center gap-3" to="/">
          <div className="w-10 h-10 bg-lando-accent flex items-center justify-center">
            <span className="text-lando-bg font-bold text-xl font-mono">L</span>
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-lando-accent">
              LANDO
            </span>
            <p className="text-xs text-lando-muted">Agent Commerce on Solana</p>
          </div>
        </Link>
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="hidden md:flex flex-wrap items-center gap-4 text-lando-muted font-mono text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-lando-accent hover:cursor-pointer"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                [{item.label}]
              </a>
            ))}
            <button
              onClick={() => {}}
              className="flex items-center gap-1 transition-colors hover:text-lando-accent"
            >
              <Sun className="h-4 w-4" />
            </button>
          </nav>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? "rotate-45 translate-y-1" : "-translate-y-0.5"
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-opacity duration-200 ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? "-rotate-45 -translate-y-1" : "translate-y-0.5"
            }`}
          ></span>
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-lando-border mt-4 pt-4 px-4">
          <nav className="flex flex-col gap-3 text-lando-muted font-mono text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-lando-accent hover:cursor-pointer"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
              >
                [{item.label}]
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
