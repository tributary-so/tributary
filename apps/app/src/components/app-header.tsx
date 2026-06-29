import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useWallet } from '@solana/wallet-adapter-react'
import { Moon, Sun } from 'lucide-react'
import { WalletButton } from '@/components/solana/solana-provider'
import { ClusterUiSelect } from './cluster/cluster-ui'

const navItems = [{ label: 'Docs', href: 'https://docs.tributary.so' }]

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark)
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDark)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-1 hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function AppHeader() {
  const { connected } = useWallet()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const scrollToSection = (id: string) => {
    navigate('/')
    sessionStorage.setItem('scrollTo', id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const section = sessionStorage.getItem('scrollTo')
    if (section) {
      sessionStorage.removeItem('scrollTo')
      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])

  return (
    <header className="py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex text-primary items-center gap-3" to="/">
          <img src="/logo.png" alt="Tributary Logo" className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-[0.3em]">TRIBUTARY</span>
        </Link>
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="hidden md:flex flex-wrap items-center gap-4 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-foreground hover:cursor-pointer"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
            <Link to="/referral" className="transition-colors hover:text-foreground">
              REFERRAL
            </Link>
            <Link to="/gateways" className="transition-colors hover:text-foreground">
              GATEWAYS
            </Link>
            {connected && (
              <button
                onClick={() => navigate('/account')}
                className="border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-accent transition-colors"
              >
                Dashboard
              </button>
            )}
            <WalletButton />
            <ClusterUiSelect />
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
            {navItems.map((item) => (
              <a
                key={item.href}
                className="transition-colors hover:text-foreground hover:cursor-pointer"
                onClick={() => {
                  scrollToSection(item.href)
                  setIsMenuOpen(false)
                }}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/referral"
              onClick={() => setIsMenuOpen(false)}
              className="transition-colors hover:text-foreground"
            >
              Referral
            </Link>
            <Link
              to="/gateways"
              onClick={() => setIsMenuOpen(false)}
              className="transition-colors hover:text-foreground"
            >
              Gateways
            </Link>
            <div className="border-t border-border pt-3 mt-2">
              {connected && (
                <button
                  onClick={() => {
                    navigate('/account')
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left border border-border px-3 py-2 mb-2"
                >
                  Dashboard
                </button>
              )}
              <WalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
