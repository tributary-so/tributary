import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/utils'
import { ThemeToggle } from '../theme/theme-toggle'

export interface NavbarItem {
  label: string
  /** Internal path (react-router), anchor (`#id` / `section-id`), or absolute URL. */
  href: string
  external?: boolean
}

export interface NavbarProps {
  /** Override the default TRIBUTARY wordmark brand block. */
  brand?: ReactNode
  items?: NavbarItem[]
  /** Right-aligned action cluster (wallet button, cluster select, …). ThemeToggle is included by default. */
  actions?: ReactNode
  /** Hide the built-in ThemeToggle when supplying your own in `actions`. */
  hideThemeToggle?: boolean
  sticky?: boolean
  /** Internal route the brand links to. */
  homeTo?: string
  className?: string
}

function NavbarLink({ item, onNavigate }: { item: NavbarItem; onNavigate?: () => void }) {
  const cls = 'transition-colors hover:text-foreground hover:cursor-pointer'
  if (item.external || /^https?:\/\//.test(item.href)) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onNavigate}>
        {item.label}
      </a>
    )
  }
  if (item.href.startsWith('/')) {
    return (
      <Link to={item.href} className={cls} onClick={onNavigate}>
        {item.label}
      </Link>
    )
  }
  // anchor/scroll-section id
  return (
    <a
      href={`#${item.href}`}
      className={cls}
      onClick={(e) => {
        e.preventDefault()
        document.getElementById(item.href)?.scrollIntoView({ behavior: 'smooth' })
        onNavigate?.()
      }}
    >
      {item.label}
    </a>
  )
}

/**
 * Slot-based site chrome — the single navbar shared across all Tributary apps.
 * Layout and typographic voice (uppercase, wide tracking, sharp borders) are
 * fixed here; apps supply links and action widgets.
 */
export function Navbar({
  brand,
  items = [],
  actions,
  hideThemeToggle = false,
  sticky = false,
  homeTo = '/',
  className,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const defaultBrand = (
    <Link className="inline-flex text-primary items-center gap-3" to={homeTo}>
      <img src="/logo.png" alt="Tributary Logo" className="h-4 w-4" />
      <span className="font-semibold text-xs uppercase tracking-[0.3em]">TRIBUTARY</span>
    </Link>
  )

  return (
    <header className={cn('py-6', sticky && 'sticky top-0 z-50 bg-background/90 backdrop-blur-sm', className)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        {brand ?? defaultBrand}
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="hidden md:flex flex-wrap items-center gap-4 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {items.map((item) => (
              <NavbarLink key={item.href} item={item} />
            ))}
            {actions}
            {!hideThemeToggle && <ThemeToggle />}
          </nav>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-opacity duration-200 ${
              isMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          ></span>
          <span
            className={`block w-5 h-0.5 bg-current transition-transform duration-200 ${
              isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'
            }`}
          ></span>
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border mt-4 pt-4 px-4">
          <nav className="flex flex-col gap-3 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {items.map((item) => (
              <NavbarLink key={item.href} item={item} onNavigate={() => setIsMenuOpen(false)} />
            ))}
            <div className="border-t border-border pt-3 mt-2 flex items-center gap-3">
              {actions}
              {!hideThemeToggle && <ThemeToggle />}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
