import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectItem } from '@heroui/react'
import { decodeMemo, type Tributary } from '@tributary-so/sdk'
import { cn } from '../lib/utils'

export interface GatewaySelectProps {
  /** Tributary SDK instance (wallet-connected); fetch is disabled while null. */
  sdk: Tributary | null
  /** Selected gateway pubkey (base58) — controlled. */
  selected: string | null
  onSelect: (gatewayPubkey: string) => void
  label?: string
  className?: string
}

/**
 * On-chain payment-gateway picker (Tributary SDK). Lists active gateways,
 * auto-selects the first one once loaded. No create option — gateways are
 * provisioned elsewhere (manager CLI).
 */
export function GatewaySelect({ sdk, selected, onSelect, label = 'Gateway', className }: GatewaySelectProps) {
  const gateways = useQuery({
    queryKey: ['payment-gateways', !!sdk],
    queryFn: async () => {
      if (!sdk) return []
      const all = await sdk.getAllPaymentGateway()
      return all.filter((g) => g.account.isActive)
    },
    enabled: !!sdk,
  })

  const list = gateways.data ?? []

  useEffect(() => {
    if (list.length > 0 && !selected) {
      onSelect(list[0].publicKey.toBase58())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length])

  return (
    <div className={className}>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        {gateways.isLoading ? (
          <div className="h-10 w-full animate-pulse bg-muted" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No active gateways on this cluster. Create one (e.g. via the manager CLI) before configuring a policy.
          </p>
        ) : (
          <Select
            selectedKeys={selected ? [selected] : []}
            onChange={(e) => onSelect(e.target.value)}
            variant="bordered"
            classNames={{ trigger: cn('border-border') }}
          >
            {list.map((g) => {
              const key = g.publicKey.toBase58()
              return (
                <SelectItem key={key} description={`${key.slice(0, 8)}…${key.slice(-6)} · ${g.account.gatewayFeeBps} bps`}>
                  {decodeMemo(g.account.name) || 'Unnamed gateway'}
                </SelectItem>
              )
            })}
          </Select>
        )}
      </label>
    </div>
  )
}
