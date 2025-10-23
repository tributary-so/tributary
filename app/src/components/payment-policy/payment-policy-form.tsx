import React, { useState, useEffect } from 'react'
import { Select, SelectItem, Input } from '@heroui/react'
import { Button } from '@/components/ui/button'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { toast } from 'sonner'
import { useSDK } from '@/lib/client'
import { useNavigate } from 'react-router'
import { type PaymentFrequency, type PaymentGateway, createMemoBuffer, decodeMemo } from '@tributary-so/sdk'
import { useAtomValue } from 'jotai'
import { availableTokensAtom, getTokenSymbolAtom } from '@/lib/token-store'

export interface PaymentPolicyFormData {
  tokenMint: string
  recipient: string
  gateway: string
  amount: string
  memo: string
  frequency: string
  autoRenew: boolean
  //maxRenewals: string
  approvalAmount: string
  intervalSeconds: string
}
export interface PaymentPolicyFormProps {
  formData: PaymentPolicyFormData
  onFormDataChange: (newFormData: PaymentPolicyFormProps['formData']) => void
}

export default function PaymentPolicyForm({ formData, onFormDataChange }: PaymentPolicyFormProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [gateways, setGateways] = useState<Array<{ publicKey: PublicKey; account: PaymentGateway }>>([])
  const [gatewaysLoading, setGatewaysLoading] = useState(false)
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false)
  const availableTokens = useAtomValue(availableTokensAtom)
  const getTokenSymbol = useAtomValue(getTokenSymbolAtom)
  const [isRecipientValid, setIsRecipientValid] = useState(true)

  useEffect(() => {
    const fetchGateways = async () => {
      if (!sdk || gatewaysLoaded) return
      try {
        setGatewaysLoading(true)
        const gatewayData = await sdk.getAllPaymentGateway()
        setGateways(gatewayData)
        if (gatewayData.length > 0 && !formData.gateway) {
          onFormDataChange({ ...formData, gateway: gatewayData[0].publicKey.toString() })
        }
        setGatewaysLoaded(true)
      } catch (error) {
        console.error('Error fetching payment gateways:', error)
      } finally {
        setGatewaysLoading(false)
      }
    }
    if (sdk && !gatewaysLoaded) {
      fetchGateways()
    }

    // init with first token in the set
    onFormDataChange({ ...formData, tokenMint: availableTokens[0].address })
  }, [sdk, gatewaysLoaded, formData, onFormDataChange, availableTokens])

  useEffect(() => {
    setIsRecipientValid(validateRecipientAddress(formData.recipient))
  }, [formData.recipient])

  useEffect(() => {
    if (wallet.publicKey && !formData.recipient) {
      onFormDataChange({ ...formData, recipient: wallet.publicKey.toString() })
    }
  }, [wallet.publicKey, formData, onFormDataChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }
    onFormDataChange(newData)

    // Validate recipient address
    if (name === 'recipient') {
      setIsRecipientValid(validateRecipientAddress(value))
    }
  }

  const validateRecipientAddress = (address: string) => {
    if (!address) return true // Allow empty for now, required validation will handle it
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error('Please connect your wallet')
      return
    }
    if (!sdk) {
      toast.error('SDK not available')
      return
    }
    setLoading(true)
    try {
      const paymentFrequency: PaymentFrequency = (() => {
        switch (formData.frequency) {
          case 'daily':
            return { daily: {} }
          case 'weekly':
            return { weekly: {} }
          case 'monthly':
            return { monthly: {} }
          case 'quarterly':
            return { quarterly: {} }
          case 'semiAnnually':
            return { semiAnnually: {} }
          case 'annually':
            return { annually: {} }
          case 'custom':
            return { custom: { 0: new anchor.BN(formData.intervalSeconds) } }
          default:
            return { daily: {} }
        }
      })()
      const memo = createMemoBuffer(formData.memo, 64)
      let approvalAmount: anchor.BN | undefined = new anchor.BN(10_000_000_000) // 10k USDC
      if (formData.approvalAmount) {
        approvalAmount = new anchor.BN(formData.approvalAmount)
      }
      const instructions = await sdk.createSubscriptionInstruction(
        new PublicKey(formData.tokenMint),
        new PublicKey(formData.recipient),
        new PublicKey(formData.gateway),
        new anchor.BN(formData.amount),
        false,
        null,
        paymentFrequency,
        memo,
        null,
        approvalAmount,
      )
      const { Transaction } = await import('@solana/web3.js')
      const transaction = new Transaction()
      instructions.forEach((ix) => transaction.add(ix))
      transaction.feePayer = wallet.publicKey
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      const signedTx = await wallet.signTransaction(transaction)
      const txId = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight })
      toast.success('Payment policy created successfully!')
      setTimeout(() => navigate('/account'), 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      toast.error('Failed to create payment policy: ' + errorMessage)
      console.error('Error creating policy:', err)
    } finally {
      setLoading(false)
    }
  }

  const labelClass = 'text-xs font-medium text-[var(--color-primary)] uppercase mb-1'

  // if (!wallet.connected) {
  //   return (
  //     <div className="items-center">
  //       <p className="text-xl">Please connect your wallet</p>
  //     </div>
  //   )
  // }

  return (
    <div className="max-w-[700px] space-y-4">
      <p className="text-sm text-gray-600">Create a new recurring payment policy and get integration code.</p>
      <div className="items-center">
        <div className="max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tokenMint" className={labelClass}>
                  Token
                </label>
                <Select
                  id="tokenMint"
                  placeholder="Select token"
                  selectedKeys={formData.tokenMint ? [formData.tokenMint] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    onFormDataChange({ ...formData, tokenMint: selectedKey })
                  }}
                  required
                  className="w-full"
                >
                  {availableTokens.map((token) => (
                    <SelectItem
                      key={token.address}
                      description={token.name ?? 'No token name'}
                      // startContent={<GitFolder className={iconClasses} />}
                    >
                      {token.symbol}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="recipient" className={labelClass}>
                  Recipient Address
                </label>
                <Input
                  id="recipient"
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleInputChange}
                  placeholder="Recipient address"
                  required
                  className={`w-full ${!isRecipientValid ? 'border-red-500' : ''}`}
                  isInvalid={!isRecipientValid}
                  errorMessage={!isRecipientValid ? 'Invalid Solana address' : undefined}
                />
              </div>
              <div>
                <label htmlFor="gateway" className={labelClass}>
                  Processor
                </label>
                {gatewaysLoading ? (
                  <div className="flex items-center justify-center h-10 border border-[var(--color-primary)] rounded">
                    <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <Select
                    id="gateway"
                    name="gateway"
                    selectedKeys={formData.gateway ? [formData.gateway] : []}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string
                      onFormDataChange({ ...formData, gateway: selectedKey })
                    }}
                    placeholder="Select gateway"
                    required
                    className="w-full"
                  >
                    {gateways.map((gateway) => (
                      <SelectItem key={gateway.publicKey.toString()} description={`${decodeMemo(gateway.account.url)}`}>
                        {decodeMemo(gateway.account.name)}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </div>
              <div>
                <label htmlFor="amount" className={labelClass}>
                  Amount
                </label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="e.g., 10"
                  required
                  min="1"
                  className="w-full"
                  endContent={
                    formData.tokenMint &&
                    getTokenSymbol(formData.tokenMint) && (
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">{getTokenSymbol(formData.tokenMint)}</span>
                      </div>
                    )
                  }
                />
              </div>
              <div>
                <label htmlFor="frequency" className={labelClass}>
                  Frequency
                </label>
                <Select
                  id="frequency"
                  name="frequency"
                  selectedKeys={formData.frequency ? [formData.frequency] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    onFormDataChange({ ...formData, frequency: selectedKey })
                  }}
                  placeholder="Select frequency"
                  className="w-full"
                >
                  <SelectItem key="daily">Daily</SelectItem>
                  <SelectItem key="weekly">Weekly</SelectItem>
                  <SelectItem key="monthly">Monthly</SelectItem>
                  <SelectItem key="quarterly">Quarterly</SelectItem>
                  <SelectItem key="semiAnnually">Semi-Annually</SelectItem>
                  <SelectItem key="annually">Annually</SelectItem>
                  <SelectItem key="custom">Custom</SelectItem>
                </Select>
              </div>
              <div className={formData.frequency != 'custom' ? 'opacity-50' : ''}>
                <label htmlFor="intervalSeconds" className={labelClass}>
                  Custom (seconds)
                </label>
                <Input
                  id="intervalSeconds"
                  name="intervalSeconds"
                  type="number"
                  value={formData.intervalSeconds}
                  onChange={handleInputChange}
                  placeholder="e.g., 2592000"
                  required
                  min="1"
                  className="w-full"
                  disabled={formData.frequency != 'custom'}
                />
              </div>
              {/* <div> */}
              {/*   <label htmlFor="maxRenewals" className={labelClass}> */}
              {/*     Max Renewals */}
              {/*   </label> */}
              {/*   <input */}
              {/*     id="maxRenewals" */}
              {/*     name="maxRenewals" */}
              {/*     type="number" */}
              {/*     value={formData.maxRenewals} */}
              {/*     onChange={handleInputChange} */}
              {/*     placeholder="Leave empty for unlimited" */}
              {/*     min="1" */}
              {/*     className={inputClass} */}
              {/*   /> */}
              {/* </div> */}
              {/* <div> */}
              {/*   <label htmlFor="approvalAmount" className={labelClass}> */}
              {/*     Approval Amount */}
              {/*   </label> */}
              {/*   <input */}
              {/*     id="approvalAmount" */}
              {/*     name="approvalAmount" */}
              {/*     type="number" */}
              {/*     value={formData.approvalAmount} */}
              {/*     onChange={handleInputChange} */}
              {/*     placeholder="Token approval amount" */}
              {/*     min="1" */}
              {/*     className={inputClass} */}
              {/*   /> */}
              {/* </div> */}
            </div>

            <div>
              <label htmlFor="memo" className={labelClass}>
                Memo (optional)
              </label>
              <Input
                id="memo"
                name="memo"
                value={formData.memo}
                onChange={handleInputChange}
                placeholder="Payment description"
                maxLength={64}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !wallet.connected || !isRecipientValid}
              className="w-full mt-6 text-sm uppercase"
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {loading ? 'Creating...' : 'Create Payment Policy'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
