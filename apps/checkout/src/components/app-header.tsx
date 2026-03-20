import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { WalletButton } from "./solana-provider";

const navItems = [
  { label: "Docs", href: "https://docs.tributary.so" },
  { label: "Main App", href: "https://app.tributary.so" },
];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldBeDark = saved === "dark" || (!saved && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1 hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex text-primary items-center gap-3" to="/">
          <img src="/logo.png" alt="Tributary Logo" className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-[0.3em]">
            TRIBUTARY
          </span>
        </Link>
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="hidden md:flex flex-wrap items-center gap-4 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-foreground hover:cursor-pointer"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
            ))}
            <WalletButton />
            <ThemeToggle />
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
        <div className="md:hidden border-t border-border mt-4 pt-4 px-4">
          <nav className="flex flex-col gap-3 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-foreground hover:cursor-pointer"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="border-t border-border pt-3 mt-2">
              <WalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
