import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Moon, Sun } from 'lucide-react'
import { WalletButton } from '@/components/solana/solana-provider'
import { ClusterUiSelect } from './cluster/cluster-ui'

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
  return (
    <header className="py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <Link className="inline-flex text-primary items-center gap-3" to="/">
          <img src="/logo.png" alt="Tributary Logo" className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-[0.3em]">TRIBUTARY</span>
        </Link>
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:justify-end md:gap-6">
          <nav className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs uppercase tracking-[0.12em]">
            <a className="transition-colors hover:text-foreground hover:cursor-pointer" href="https://app.tributary.so">
              Back to App
            </a>
            <a
              className="transition-colors hover:text-foreground hover:cursor-pointer"
              href="https://docs.tributary.so"
            >
              Docs
            </a>
            <WalletButton />
            <ClusterUiSelect />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
