import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import logo from "../assets/logo.png";

const navItems = [
  { label: "How It Works", href: "how-it-works" },
  { label: "Payment Types", href: "payment-solutions" },
  { label: "Testimonials", href: "testimonials" },
  { label: "FAQ", href: "faq" },
];

const products = [
  {
    label: "Documentation",
    href: "https://docs.tributary.so",
    description: "Learn how to integrate Tributary",
    external: true,
  },
  {
    label: "SDK Reference",
    href: "https://docs.tributary.so/sdk",
    description: "TypeScript SDK documentation",
    external: true,
  },
  {
    label: "React Components",
    href: "https://docs.tributary.so/sdk-react",
    description: "Pre-built payment UI components",
    external: true,
  },
];

export function Header() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    navigate("/");
    sessionStorage.setItem("scrollTo", id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const section = sessionStorage.getItem("scrollTo");
    if (section) {
      sessionStorage.removeItem("scrollTo");
      setTimeout(() => {
        document
          .getElementById(section)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  return (
    <header className="py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex text-primary items-center gap-3" to="/">
          <img src={logo} alt="Tributary Logo" className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-[0.3em]">
            TRIBUTARY
          </span>
        </Link>
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-foreground hover:cursor-pointer"
                onClick={() => scrollToSection(item.href)}
              >
                {item.label}
              </a>
            ))}
            <div className="relative group">
              <button className="flex items-center gap-1 transition-colors hover:text-foreground">
                DEVELOPERS
                <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-background border border-border shadow-lg min-w-48 py-2">
                  {products.map((product) =>
                    product.external ? (
                      <a
                        key={product.href}
                        href={product.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-xs uppercase tracking-[0.12em] text-foreground">
                          {product.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 normal-case tracking-normal">
                          {product.description}
                        </div>
                      </a>
                    ) : (
                      <Link
                        key={product.href}
                        to={product.href}
                        className="block px-4 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-xs uppercase tracking-[0.12em] text-foreground">
                          {product.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 normal-case tracking-normal">
                          {product.description}
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
            <ThemeToggle />
          </nav>
          <a
            href="https://app.tributary.so"
            className="text-sm border border-primary border p-2 rounded-lg"
          >
            OPEN APP
          </a>
        </div>
      </div>
    </header>
  );
}
