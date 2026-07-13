import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Switch, Input } from '@heroui/react'
import { addToast } from '@heroui/react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { GATEWAY_FEATURES, type PaymentGateway } from '@tributary-so/sdk'
import { InlineEdit } from '../inline-edit'

export interface FeesSectionProps {
  account: PaymentGateway
  authority: PublicKey
  onMutated: () => Promise<void>
}

const MAX_BPS = 10000

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

export function FeesSection({ account, authority, onMutated }: FeesSectionProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)

  const [feeBps, setFeeBps] = useState(String(account.gatewayFeeBps))
  const [savingFee, setSavingFee] = useState(false)
  const [togglingNet, setTogglingNet] = useState(false)

  const netOn = (account.featureFlags & GATEWAY_FEATURES.NET_AMOUNT) !== 0
  const customOn = (account.featureFlags & GATEWAY_FEATURES.CUSTOM_PROTOCOL_FEE) !== 0

  const newFeeBpsNum = Number(feeBps)
  const feeValid = Number.isInteger(newFeeBpsNum) && newFeeBpsNum >= 0 && newFeeBpsNum < MAX_BPS

  const saveFeeBps = async () => {
    if (!sdk || !feeValid) return
    setSavingFee(true)
    try {
      const ix = await sdk.changeGatewayFeeBps(authority, newFeeBpsNum)
      await createAndSendTransaction([ix], wallet, connection)
      addToast({ title: 'Gateway fee updated', color: 'success' })
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update gateway fee'
      addToast({ title: 'Update failed', description: msg, color: 'danger' })
      throw err
    } finally {
      setSavingFee(false)
    }
  }

  const toggleNet = async (next: boolean) => {
    if (!sdk) return
    setTogglingNet(true)
    try {
      const newFlags = (account.featureFlags & ~GATEWAY_FEATURES.NET_AMOUNT) | (next ? GATEWAY_FEATURES.NET_AMOUNT : 0)
      const ix = await sdk.updateGatewayFeatureFlags(authority, newFlags)
      await createAndSendTransaction([ix], wallet, connection)
      addToast({ title: `Net-amount mode ${next ? 'enabled' : 'disabled'}`, color: 'success' })
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle net-amount'
      addToast({ title: 'Toggle failed', description: msg, color: 'danger' })
    } finally {
      setTogglingNet(false)
    }
  }

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6 space-y-5">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Fees</h2>
        <p className="text-xs text-muted-foreground">
          Gateway fee charged on every payment. Combined gateway + protocol fee must stay below 100%.
        </p>
      </header>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Gateway fee</div>
        <InlineEdit
          canSave={feeValid}
          saving={savingFee}
          onSave={saveFeeBps}
          display={
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-foreground">{bpsToPercent(account.gatewayFeeBps)}</span>
              <span className="text-xs text-muted-foreground font-mono">({account.gatewayFeeBps} bps)</span>
            </div>
          }
          editor={
            <div className="space-y-1">
              <Input
                type="number"
                value={feeBps}
                onValueChange={setFeeBps}
                min={0}
                max={MAX_BPS - 1}
                description="Basis points (100 bps = 1%). Combined with protocol fee must be < 10000."
                classNames={{ inputWrapper: 'border border-border' }}
              />
              {!feeValid && feeBps.length > 0 && (
                <p className="text-xs text-overdue-600">Invalid: combined bps must stay below 10000.</p>
              )}
            </div>
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-foreground">Net-amount mode</div>
          <p className="text-xs text-muted-foreground">
            On = recipient receives exactly the payment amount, fees added on top. Off = fees deducted from the payment.
          </p>
        </div>
        <Switch isSelected={netOn} isDisabled={togglingNet} onValueChange={toggleNet} />
      </div>

      {/* Protocol fee is read-only: update_gateway_protocol_fee requires the protocol-admin
          signer (config.admin), not the gateway authority. A gateway authority cannot change
          this — surfacing an edit would always fail Unauthorized. Display-only is the honest UX. */}
      <div className="border-t border-border pt-4 space-y-2">
        <div>
          <div className="text-sm font-medium text-foreground">Protocol fee</div>
          <p className="text-xs text-muted-foreground">
            {customOn
              ? 'Custom override active for this gateway.'
              : 'Standard protocol fee applies (set globally on ProgramConfig).'}{' '}
            <span className="text-muted-foreground/70">
              Protocol-admin only — not editable by the gateway authority.
            </span>
          </p>
        </div>
        {customOn && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-foreground">
              {bpsToPercent(account.customProtocolShareBps)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">({account.customProtocolShareBps} bps)</span>
          </div>
        )}
      </div>
    </section>
  )
}
