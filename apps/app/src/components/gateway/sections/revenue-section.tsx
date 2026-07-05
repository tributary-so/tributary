import { useEffect, useState } from 'react'
import { Loader2, TrendingUp, LogOut } from 'lucide-react'
import { merchantApi, type MerchantAuthState, type MerchantRevenue } from '../merchant/api'

interface Props {
  gateway: string
  auth: MerchantAuthState
  tokenMintLabel?: string
}

function useRevenue(gateway: string, authenticated: boolean) {
  const [data, setData] = useState<MerchantRevenue | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await merchantApi.revenue(gateway)
        if (!cancelled) setData(r)
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

  return { data, loading, error }
}

function bigNumber(value: string, label: string, sub?: string) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Sparkline({ series }: { series: MerchantRevenue['series'] }) {
  if (!series.length) {
    return <div className="text-xs text-muted-foreground">No series yet.</div>
  }
  const max = Math.max(1, ...series.map((s) => Number(s.recognized)))
  return (
    <div className="flex items-end gap-0.5 h-12">
      {series.slice(-14).map((p) => {
        const h = Math.max(2, Math.floor((Number(p.recognized) / max) * 100))
        return (
          <div
            key={p.ts}
            title={`${p.ts}: ${p.recognized}`}
            className="flex-1 bg-foreground/20 hover:bg-foreground/40 transition-colors"
            style={{ height: `${h}%` }}
          />
        )
      })}
    </div>
  )
}

export function RevenueSection({ gateway, auth }: Props) {
  const { authenticated, signIn, signOut, signingIn, error } = auth
  const { data, loading, error: loadError } = useRevenue(gateway, authenticated)

  if (!authenticated) {
    return (
      <section className="border border-border bg-muted/30 p-4 sm:p-6">
        <header className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Revenue</h2>
          <p className="text-xs text-muted-foreground">
            Sign with your wallet to unlock policy, subscriber and revenue data.
          </p>
        </header>
        <button
          onClick={() => void signIn()}
          disabled={signingIn}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] border border-border px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {signingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
          {signingIn ? 'Signing…' : 'Connect & sign'}
        </button>
        {error && <p className="text-xs text-overdue-600 mt-2">{error}</p>}
      </section>
    )
  }

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Revenue</h2>
          <p className="text-xs text-muted-foreground">On-chain volume for this gateway. Token units, no fiat FX.</p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : loadError ? (
        <p className="text-xs text-overdue-600">{loadError}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {bigNumber(data.mrr, 'MRR', 'active subscriptions, monthly-normalized')}
            {bigNumber(data.recognizedRevenue, 'Recognized', 'all variants, lifetime')}
            {bigNumber(String(data.activeSubscriptionCount), 'Active subs')}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Recognized / day (last 14)
            </div>
            <Sparkline series={data.series} />
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            MRR = active on-chain subscriptions only; not churn-adjusted. Silent churn (delegate revoked, funds moved)
            is invisible to the contract — there is no payment-failure event.
          </p>
        </>
      ) : null}
    </section>
  )
}
