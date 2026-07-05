import { useEffect, useState } from 'react'
import { Loader2, Download } from 'lucide-react'
import { merchantApi, type MerchantAuthState, type MerchantSubscriber } from '../merchant/api'

interface Props {
  gateway: string
  auth: MerchantAuthState
}

function useSubscribers(gateway: string, authenticated: boolean) {
  const [items, setItems] = useState<MerchantSubscriber[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await merchantApi.subscribers(gateway, { limit: 100 })
        if (!cancelled) {
          setItems(r.items)
          setTotal(r.total)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gateway, authenticated])

  return { items, total, loading, error }
}

function Truncate({ value, head = 4, tail = 4 }: { value: string; head?: number; tail?: number }) {
  if (value.length <= head + tail + 1) return <span className="font-mono">{value}</span>
  return (
    <span className="font-mono" title={value}>
      {value.slice(0, head)}…{value.slice(-tail)}
    </span>
  )
}

export function SubscribersSection({ gateway, auth }: Props) {
  const authenticated = auth.authenticated
  const { items, total, loading, error } = useSubscribers(gateway, authenticated)

  if (!authenticated) return null

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6 space-y-3">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Subscribers <span className="text-muted-foreground font-normal">({total})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Distinct payer wallets on this gateway. Identity = wallet address; no enriched profile.
          </p>
        </div>
        <a
          href={merchantApi.exportUrl(gateway, 'subscribers')}
          className="inline-flex items-center gap-1.5 text-xs border border-border px-2 py-1 hover:bg-accent transition-colors"
        >
          <Download className="w-3 h-3" /> CSV
        </a>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-xs text-overdue-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No subscribers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Wallet</th>
                <th className="py-2 pr-2 text-right">Policies</th>
                <th className="py-2 pr-2 text-right">Total paid</th>
                <th className="py-2 pr-2">Last active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.wallet} className="border-b border-border/50">
                  <td className="py-2 pr-2">
                    <Truncate value={s.wallet} />
                  </td>
                  <td className="py-2 pr-2 text-right font-mono">{s.policyCount}</td>
                  <td className="py-2 pr-2 text-right font-mono">{s.totalPaid}</td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {s.lastActiveAt ? new Date(s.lastActiveAt * 1000).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
