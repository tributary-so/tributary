import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Switch, Input } from '@heroui/react'
import { addToast } from '@heroui/react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { GATEWAY_FEATURES, type PaymentGateway } from '@tributary-so/sdk'
import { InlineEdit } from '../inline-edit'

export interface ReferralSectionProps {
  account: PaymentGateway
  authority: PublicKey
  onMutated: () => Promise<void>
}

const MAX_ALLOCATION_BPS = 2500

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

export function ReferralSection({ account, authority, onMutated }: ReferralSectionProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)

  const referralOn = (account.featureFlags & GATEWAY_FEATURES.REFERRAL) !== 0

  const [toggling, setToggling] = useState(false)
  const [alloc, setAlloc] = useState(String(account.referralAllocationBps))
  const [savingAlloc, setSavingAlloc] = useState(false)
  const [tiers, setTiers] = useState<[string, string, string]>(
    account.referralTiersBps.map((n) => String(n)) as [string, string, string],
  )
  const [savingTiers, setSavingTiers] = useState(false)

  const allocNum = Number(alloc)
  const allocValid = Number.isInteger(allocNum) && allocNum >= 0 && allocNum <= MAX_ALLOCATION_BPS

  const tierNums = tiers.map((t) => Number(t))
  const tiersValid =
    tierNums.every((n) => Number.isInteger(n) && n >= 0) && tierNums[0] + tierNums[1] + tierNums[2] === 10000

  const toggleReferral = async (next: boolean) => {
    if (!sdk) return
    setToggling(true)
    try {
      const newFlags = (account.featureFlags & ~GATEWAY_FEATURES.REFERRAL) | (next ? GATEWAY_FEATURES.REFERRAL : 0)
      const ix = await sdk.updateGatewayFeatureFlags(authority, newFlags)
      await createAndSendTransaction([ix], wallet, connection)
      addToast({ title: `Referral program ${next ? 'enabled' : 'disabled'}`, color: 'success' })
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle referral'
      addToast({ title: 'Toggle failed', description: msg, color: 'danger' })
    } finally {
      setToggling(false)
    }
  }

  const saveAllocation = async () => {
    if (!sdk || !allocValid) return
    setSavingAlloc(true)
    try {
      // updateGatewayReferralSettings takes featureFlags + allocation + tiers
      // (all required in the SDK signature). We pass through current tiers
      // unchanged. Bits 0 and 1 are accepted; bit 2 is preserved on-chain.
      const ix = await sdk.updateGatewayReferralSettings(
        authority,
        account.featureFlags,
        allocNum,
        account.referralTiersBps as [number, number, number],
      )
      await createAndSendTransaction([ix], wallet, connection)
      addToast({ title: 'Referral allocation updated', color: 'success' })
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update allocation'
      addToast({ title: 'Update failed', description: msg, color: 'danger' })
      throw err
    } finally {
      setSavingAlloc(false)
    }
  }

  const saveTiers = async () => {
    if (!sdk || !tiersValid) return
    setSavingTiers(true)
    try {
      const newTiers: [number, number, number] = [tierNums[0], tierNums[1], tierNums[2]]
      const ix = await sdk.updateGatewayReferralSettings(
        authority,
        account.featureFlags,
        account.referralAllocationBps,
        newTiers,
      )
      await createAndSendTransaction([ix], wallet, connection)
      addToast({ title: 'Tier split updated', color: 'success' })
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update tiers'
      addToast({ title: 'Update failed', description: msg, color: 'danger' })
      throw err
    } finally {
      setSavingTiers(false)
    }
  }

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6 space-y-5">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Referral program</h2>
        <p className="text-xs text-muted-foreground">
          Fund a referral pool from gateway fees; split it across 3 chain levels.
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-foreground">Referral enabled</div>
          <p className="text-xs text-muted-foreground">
            On = gateway fees carve out a referral pool distributed across referrer chains.
          </p>
        </div>
        <Switch isSelected={referralOn} isDisabled={toggling} onValueChange={toggleReferral} />
      </div>

      {referralOn && (
        <>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Referral allocation</div>
            <InlineEdit
              canSave={allocValid}
              saving={savingAlloc}
              onSave={saveAllocation}
              display={
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-foreground">
                    {bpsToPercent(account.referralAllocationBps)}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({account.referralAllocationBps} bps of gateway fee)
                  </span>
                </div>
              }
              editor={
                <Input
                  type="number"
                  value={alloc}
                  onValueChange={setAlloc}
                  min={0}
                  max={MAX_ALLOCATION_BPS}
                  description="Bps of the gateway fee funding the pool (0–2500)."
                  classNames={{ inputWrapper: 'border border-border' }}
                />
              }
            />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Tier split (must sum to 10000 bps)
            </div>
            <InlineEdit
              canSave={tiersValid}
              saving={savingTiers}
              onSave={saveTiers}
              display={
                <div className="flex items-baseline gap-3 font-mono text-sm">
                  {[0, 1, 2].map((i) => (
                    <span key={i}>
                      <span className="text-[10px] text-muted-foreground uppercase">L{i + 1}</span>{' '}
                      {bpsToPercent(account.referralTiersBps[i])}
                    </span>
                  ))}
                </div>
              }
              editor={
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <Input
                        key={i}
                        type="number"
                        label={`L${i + 1}`}
                        labelPlacement="outside"
                        value={tiers[i]}
                        onValueChange={(v) =>
                          setTiers((prev) => {
                            const next = [...prev] as [string, string, string]
                            next[i] = v
                            return next
                          })
                        }
                        min={0}
                        max={10000}
                        classNames={{ inputWrapper: 'border border-border' }}
                      />
                    ))}
                  </div>
                  {!tiersValid && (
                    <p className="text-xs text-overdue-600">
                      Each tier must be a non-negative integer; the three must sum to 10000.
                    </p>
                  )}
                </div>
              }
            />
          </div>
        </>
      )}
    </section>
  )
}
