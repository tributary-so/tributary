import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ExternalLink, Loader2, Inbox, ArrowRight } from 'lucide-react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import { decodeMemo } from '@tributary-so/sdk'
import type { PaymentGateway } from '@tributary-so/sdk'
import { PublicKey } from '@solana/web3.js'
import { addToast } from '@heroui/react'
import { GatewayCard } from './gateway-card'
import { TALLY_REQUEST_URL } from './constants'
import { useGatewayAuthority } from './use-gateway-authority'

export default function GatewaysPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [gateways, setGateways] = useState<Array<{ publicKey: PublicKey; account: PaymentGateway }>>([])
  const [loading, setLoading] = useState(true)
  const { gateway, isAuthority, loading: authorityLoading } = useGatewayAuthority()

  useEffect(() => {
    const fetchAll = async () => {
      if (!sdk) return
      try {
        setLoading(true)
        const all = await sdk.getAllPaymentGateway()
        // Newest first — improves default surfacing for active clusters.
        all.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber())
        setGateways(all)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        addToast({ title: 'Failed to load gateways', description: msg, color: 'danger' })
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [sdk])

  const authorityName = gateway ? decodeMemo(Array.from(gateway.name)) || 'your gateway' : ''

  return (
    <div className="py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gateways</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Service providers executing recurring payments on Tributary.
          </p>
        </div>
        <a
          href={TALLY_REQUEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] border border-border px-3 py-2 hover:bg-accent transition-colors"
        >
          Request a gateway <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      {isAuthority && authorityName && (
        <Link
          to="/gateway/manage"
          className="block border border-policy-300 bg-policy-50 px-4 py-3 hover:bg-policy-100 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-policy-800">
              You are the authority of <span className="font-semibold">{authorityName}</span> — manage it
            </div>
            <ArrowRight className="w-4 h-4 text-policy-700" />
          </div>
        </Link>
      )}

      {loading || authorityLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading gateways…
        </div>
      ) : gateways.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No gateways yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            No payment gateways exist on this cluster yet. Be the first.
          </p>
          <a
            href={TALLY_REQUEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] border border-border px-3 py-2 mt-2 hover:bg-accent transition-colors"
          >
            Request a gateway <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {gateways.map((g) => (
            <GatewayCard key={g.publicKey.toString()} publicKey={g.publicKey} account={g.account} />
          ))}
        </div>
      )}
    </div>
  )
}
