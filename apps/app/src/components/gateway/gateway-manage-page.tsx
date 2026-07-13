import { ExternalLink, Loader2, ShieldAlert } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGatewayAuthority } from './use-gateway-authority'
import { TALLY_REQUEST_URL } from './constants'
import { IdentitySection } from './sections/identity-section'
import { FeesSection } from './sections/fees-section'
import { ReferralSection } from './sections/referral-section'
import { KeysSection } from './sections/keys-section'
import { RevenueSection } from './sections/revenue-section'
import { PoliciesSection } from './sections/policies-section'
import { SubscribersSection } from './sections/subscribers-section'
import { useMerchantAuth } from './merchant/api'

export default function GatewayManagePage() {
  const wallet = useWallet()
  const { gateway, gatewayPda, authority, isAuthority, loading, refresh } = useGatewayAuthority()
  const merchantAuth = useMerchantAuth(gatewayPda?.toString() ?? null)

  if (!wallet.connected) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Connect your wallet</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Gateway management is authority-scoped. Connect the wallet that controls a gateway to continue.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading gateway…
      </div>
    )
  }

  if (!isAuthority || !gateway || !authority || !gatewayPda) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">You don't own a gateway</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The connected wallet is not the authority of any gateway. Each authority owns at most one gateway.
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
    )
  }

  return (
    <div className="py-8 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Manage gateway</h1>
        <p className="text-sm text-muted-foreground mt-1">Authority controls. Edits submit an on-chain transaction.</p>
      </header>

      <IdentitySection account={gateway} />
      <FeesSection account={gateway} authority={authority} onMutated={refresh} />
      <ReferralSection account={gateway} authority={authority} onMutated={refresh} />
      <KeysSection account={gateway} authority={authority} onMutated={refresh} />

      <div className="pt-6 border-t border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-3">Merchant</h2>
        <div className="space-y-4">
          <RevenueSection gateway={gatewayPda.toString()} auth={merchantAuth} />
          <PoliciesSection gateway={gatewayPda.toString()} auth={merchantAuth} />
          <SubscribersSection gateway={gatewayPda.toString()} auth={merchantAuth} />
        </div>
      </div>
    </div>
  )
}
