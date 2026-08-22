import { Droplets } from 'lucide-react'
import { cn } from '../lib/utils'

export interface FooterLink {
  label: string
  href: string
}

export interface FooterLinkGroup {
  title: string
  links: FooterLink[]
}

export interface FooterProps {
  /** Defaults to the Tributary link set — omit for the standard footer. */
  linkGroups?: FooterLinkGroup[]
  tagline?: string
  copyright?: string
  className?: string
}

const defaultLinkGroups: FooterLinkGroup[] = [
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: 'https://docs.tributary.so' },
      { label: 'GitHub Repository', href: 'https://github.com/tributary-so/tributary' },
      { label: 'Contribute', href: 'https://contribute.so' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'X (Twitter)', href: 'https://x.com/tributaryso' },
      { label: 'Telegram', href: 'https://t.me/tributary_so' },
      { label: 'Colosseum', href: 'https://arena.colosseum.org/projects/explore/tributary-1' },
    ],
  },
]

/**
 * Standard Tributary site footer. Defaults encode the canonical link set so
 * every app renders the same footer for free.
 */
export function Footer({
  linkGroups = defaultLinkGroups,
  tagline = 'Non-custodial payment policies on Solana. Delegate once; money moves on schedule.',
  copyright = '© 2026 Tributary. Built on Solana.',
  className,
}: FooterProps) {
  return (
    <footer className={cn('border-t border-border/50', className)}>
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="h-5 w-5 text-primary" />
              <span className="font-semibold uppercase tracking-[0.3em]">TRIBUTARY</span>
            </div>
            <p className="text-sm text-muted-foreground">{tagline}</p>
          </div>
          {linkGroups.map((group) => (
            <div key={group.title}>
              <div className="font-medium text-sm mb-4">{group.title}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground/60 mt-8">{copyright}</div>
      </div>
    </footer>
  )
}
