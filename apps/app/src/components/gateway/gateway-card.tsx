import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { decodeMemo, GATEWAY_FEATURES, type PaymentGateway } from '@tributary-so/sdk'

function truncatePk(pk: PublicKey | string): string {
  const s = pk.toString()
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

function FeatureBadges({ flags }: { flags: number }) {
  const badges: { label: string; on: boolean }[] = [
    { label: 'Referral', on: (flags & GATEWAY_FEATURES.REFERRAL) !== 0 },
    { label: 'Net', on: (flags & GATEWAY_FEATURES.NET_AMOUNT) !== 0 },
    {
      label: 'Custom fee',
      on: (flags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE) !== 0,
    },
  ]
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map(
        (b) =>
          b.on && (
            <span
              key={b.label}
              className="inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-policy-50 text-policy-700 border border-policy-200"
            >
              {b.label}
            </span>
          ),
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-1.5 border-b border-border last:border-0 gap-0.5 sm:gap-2">
      <span className="sm:min-w-[140px] text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs sm:text-sm text-foreground font-mono break-all">{value}</span>
    </div>
  )
}

export interface GatewayCardProps {
  publicKey: PublicKey
  account: PaymentGateway
}

export function GatewayCard({ publicKey, account }: GatewayCardProps) {
  const [expanded, setExpanded] = useState(false)
  const name = decodeMemo(Array.from(account.name)) || 'Unnamed gateway'
  const url = decodeMemo(Array.from(account.url))
  const created = new Date(account.createdAt.toNumber() * 1000)
  const referralOn = (account.featureFlags & GATEWAY_FEATURES.REFERRAL) !== 0
  const customFeeOn = (account.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE) !== 0

  return (
    <div className="border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-muted/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                account.isActive ? 'bg-status-active-50 text-status-active-700' : 'bg-muted text-muted-foreground'
              }`}
            >
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
            <FeatureBadges flags={account.featureFlags} />
          </div>
          {url && (
            <a
              href={url.startsWith('http') ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-xs text-policy-700 hover:underline truncate"
            >
              {url}
            </a>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground mt-2 font-mono">
            <span>auth: {truncatePk(account.authority)}</span>
            <span>fee: {bpsToPercent(account.gatewayFeeBps)}</span>
            <span>created: {created.toLocaleDateString()}</span>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-1 bg-background">
          <Row label="Gateway address" value={publicKey.toString()} />
          <Row label="Authority" value={account.authority.toString()} />
          <Row label="Fee recipient" value={truncatePk(account.feeRecipient)} />
          <Row label="Gateway fee" value={bpsToPercent(account.gatewayFeeBps)} />
          {customFeeOn && <Row label="Custom protocol fee" value={bpsToPercent(account.customProtocolFeeBps)} />}
          {referralOn && (
            <>
              <Row label="Referral allocation" value={bpsToPercent(account.referralAllocationBps)} />
              <Row
                label="Tier split (L1/L2/L3)"
                value={`${account.referralTiersBps[0] / 100}% / ${account.referralTiersBps[1] / 100}% / ${
                  account.referralTiersBps[2] / 100
                }%`}
              />
            </>
          )}
          <Row label="Created at" value={created.toLocaleString()} />
        </div>
      )}
    </div>
  )
}
