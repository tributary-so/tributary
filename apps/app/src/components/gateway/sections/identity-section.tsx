import { PublicKey } from '@solana/web3.js'
import { decodeMemo, type PaymentGateway } from '@tributary-so/sdk'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border last:border-0 gap-0.5 sm:gap-2">
      <span className="sm:min-w-[160px] text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs sm:text-sm text-foreground font-mono break-all">{value}</span>
    </div>
  )
}

export interface IdentitySectionProps {
  account: PaymentGateway
}

export function IdentitySection({ account }: IdentitySectionProps) {
  const name = decodeMemo(Array.from(account.name)) || '—'
  const url = decodeMemo(Array.from(account.url)) || '—'
  const created = new Date(account.createdAt.toNumber() * 1000)

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6">
      <header className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Identity</h2>
        <p className="text-xs text-muted-foreground">Set at creation. These fields cannot be changed.</p>
      </header>
      <div>
        <Field label="Name" value={name} />
        <Field
          label="URL"
          value={
            url !== '—' ? (
              <a
                href={url.startsWith('http') ? url : `https://${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-policy-700 hover:underline"
              >
                {url}
              </a>
            ) : (
              '—'
            )
          }
        />
        <Field label="Authority" value={account.authority.toString()} />
        <Field label="Created" value={created.toLocaleString()} />
        <Field
          label="Active"
          value={
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                account.isActive ? 'bg-status-active-50 text-status-active-700' : 'bg-muted text-muted-foreground'
              }`}
            >
              {account.isActive ? 'Yes' : 'No'}
            </span>
          }
        />
      </div>
    </section>
  )
}

// Re-export PublicKey to keep imports tidy in callers.
export type { PublicKey }
