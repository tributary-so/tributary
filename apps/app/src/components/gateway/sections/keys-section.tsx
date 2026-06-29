import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { addToast } from '@heroui/react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import type { PaymentGateway } from '@tributary-so/sdk'
import { KeysDiffModal, type KeysField } from '../keys-diff-modal'

export interface KeysSectionProps {
  account: PaymentGateway
  authority: PublicKey
  onMutated: () => Promise<void>
}

function truncate(pk: PublicKey): string {
  const s = pk.toString()
  return `${s.slice(0, 6)}…${s.slice(-6)}`
}

export function KeysSection({ account, authority, onMutated }: KeysSectionProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [field, setField] = useState<KeysField | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const open = (f: KeysField) => setField(f)
  const close = () => setField(null)

  const handleConfirm = async (newKey: PublicKey) => {
    if (!sdk || !field) return
    setSubmitting(true)
    try {
      const ix =
        field === 'signer'
          ? await sdk.changeGatewaySigner(authority, newKey)
          : await sdk.changeGatewayFeeRecipient(authority, newKey)
      await createAndSendTransaction([ix], wallet, connection)
      addToast({
        title: `${field === 'signer' ? 'Signer' : 'Fee recipient'} updated`,
        color: 'success',
      })
      close()
      await onMutated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update key'
      addToast({ title: 'Update failed', description: msg, color: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="border border-border bg-muted/30 p-4 sm:p-6 space-y-3">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Keys 🔴</h2>
        <p className="text-xs text-muted-foreground">High-impact rotations. Each change opens a confirmation modal.</p>
      </header>

      <div className="flex items-center justify-between gap-2 py-2 border-b border-border">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Signer</div>
          <div className="text-xs sm:text-sm font-mono break-all">{truncate(account.signer)}</div>
        </div>
        <button
          type="button"
          onClick={() => open('signer')}
          className="text-xs uppercase tracking-wide border border-border px-2 py-1 hover:bg-accent"
        >
          Edit
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 py-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fee recipient</div>
          <div className="text-xs sm:text-sm font-mono break-all">{truncate(account.feeRecipient)}</div>
        </div>
        <button
          type="button"
          onClick={() => open('fee_recipient')}
          className="text-xs uppercase tracking-wide border border-border px-2 py-1 hover:bg-accent"
        >
          Edit
        </button>
      </div>

      <KeysDiffModal
        isOpen={field !== null}
        onOpenChange={(o) => (o ? undefined : close())}
        field={field ?? 'signer'}
        current={field === 'fee_recipient' ? account.feeRecipient : account.signer}
        authority={authority}
        feeRecipient={account.feeRecipient}
        submitting={submitting}
        onConfirm={handleConfirm}
      />
    </section>
  )
}
