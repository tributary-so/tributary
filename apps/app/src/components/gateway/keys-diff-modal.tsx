import { useEffect, useMemo, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'

export type KeysField = 'signer' | 'fee_recipient'

export interface KeysDiffModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  field: KeysField
  current: PublicKey
  authority: PublicKey
  feeRecipient: PublicKey
  submitting?: boolean
  onConfirm: (newKey: PublicKey) => Promise<void>
}

const CONSEQUENCE: Record<KeysField, string> = {
  signer:
    'Payments will halt until the new key is used to execute. Ensure the new signer is operational before confirming.',
  fee_recipient:
    'Gateway and protocol fees will route to the new address. The old recipient will immediately stop receiving fees.',
}

function truncate(s: string): string {
  return `${s.slice(0, 6)}…${s.slice(-6)}`
}

function isValidPubkey(v: string): boolean {
  try {
    new PublicKey(v)
    return true
  } catch {
    return false
  }
}

export function KeysDiffModal({
  isOpen,
  onOpenChange,
  field,
  current,
  authority,
  feeRecipient,
  submitting,
  onConfirm,
}: KeysDiffModalProps) {
  const [value, setValue] = useState('')
  const [showFull, setShowFull] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      setShowFull(false)
    }
  }, [isOpen])

  const trimmed = value.trim()
  const valid = trimmed.length > 0 && isValidPubkey(trimmed)
  const isNoOp = valid && trimmed === current.toString()
  const newPk = valid ? new PublicKey(trimmed) : null
  const isSelfAuthority = newPk ? newPk.equals(authority) : false
  const isSelfFeeRecipient = newPk ? newPk.equals(feeRecipient) : false
  const isSelfRef = field === 'signer' ? isSelfAuthority || isSelfFeeRecipient : isSelfAuthority

  const canConfirm = valid && !isNoOp

  const label = field === 'signer' ? 'signer' : 'fee recipient'

  const warnings = useMemo(() => {
    const w: string[] = []
    if (trimmed && !valid) w.push('Not a valid Solana public key.')
    if (isNoOp) w.push('New key matches the current one — this is a no-op.')
    if (isSelfAuthority) w.push('New key is the gateway authority (self-referral pattern).')
    if (isSelfFeeRecipient && field === 'signer')
      w.push('New signer is the current fee recipient — fees and execution collide.')
    return w
  }, [trimmed, valid, isNoOp, isSelfAuthority, isSelfFeeRecipient, field])

  const handleConfirm = async () => {
    if (!newPk) return
    await onConfirm(newPk)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-lg font-semibold">Change {label}</span>
          <span className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            High-impact key rotation
          </span>
        </ModalHeader>
        <ModalBody className="gap-4">
          <div className="text-sm bg-muted/50 border border-border p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-milestone-600 shrink-0 mt-0.5" />
            <span className="text-foreground">{CONSEQUENCE[field]}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Current</div>
              <div className="font-mono text-xs break-all">
                {showFull ? current.toString() : truncate(current.toString())}
              </div>
            </div>
            <div className="border border-policy-300 bg-policy-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-policy-700 mb-1">New</div>
              <div className="font-mono text-xs break-all min-h-[1.5em]">
                {newPk ? (showFull ? newPk.toString() : truncate(newPk.toString())) : '—'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="self-start text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            {showFull ? 'Show truncated' : 'Show full keys'}
          </button>

          <Input
            label={`New ${label} (base58 pubkey)`}
            labelPlacement="outside"
            placeholder="Paste the new public key…"
            value={value}
            onValueChange={setValue}
            isInvalid={trimmed.length > 0 && !valid}
            errorMessage={trimmed.length > 0 && !valid ? 'Invalid public key format.' : undefined}
            classNames={{ inputWrapper: 'border border-border' }}
          />

          {warnings.length > 0 && (
            <ul className="text-xs space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className={`flex gap-1.5 ${isNoOp ? 'text-muted-foreground' : 'text-milestone-700'}`}>
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)} isDisabled={submitting}>
            Cancel
          </Button>
          <Button color="primary" isDisabled={!canConfirm || isSelfRef} isLoading={submitting} onPress={handleConfirm}>
            I understand, change {label}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
