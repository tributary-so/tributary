import React, { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { toast } from 'sonner'
import { useSDK } from '@/lib/client'
import { useNavigate } from 'react-router'
import { type PolicyType, type PaymentFrequency, type PaymentGateway, createMemoBuffer } from '@tributary-so/sdk'

export interface PaymentPolicyFormData {
  tokenMint: string
  recipient: string
  gateway: string
  amount: string
  intervalSeconds: string
  memo: string
  frequency: string
  autoRenew: boolean
  maxRenewals: string
  approvalAmount: string
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

  useEffect(() => {
    if (wallet.publicKey && !formData.recipient) {
      onFormDataChange({ ...formData, recipient: wallet.publicKey.toString() })
    }
  }, [wallet.publicKey, formData, onFormDataChange])

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
  }, [sdk, gatewaysLoaded, formData, onFormDataChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }
    onFormDataChange(newData)
  }

  const truncateAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
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
      const policyType: PolicyType = {
        subscription: {
          amount: new anchor.BN(formData.amount),
          intervalSeconds: new anchor.BN(formData.intervalSeconds),
          autoRenew: formData.autoRenew,
          maxRenewals: formData.maxRenewals ? parseInt(formData.maxRenewals) : null,
          padding: Array(8).fill(new anchor.BN(0)),
        },
      }
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
          default:
            return { daily: {} }
        }
      })()
      const memo = createMemoBuffer(formData.memo, 64)
      let approvalAmount: anchor.BN | undefined = undefined
      if (formData.approvalAmount) {
        approvalAmount = new anchor.BN(formData.approvalAmount)
      }
      const instructions = await sdk.createSubscriptionInstruction(
        new PublicKey(formData.tokenMint),
        new PublicKey(formData.recipient),
        new PublicKey(formData.gateway),
        policyType,
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

  const inputClass =
    'w-full px-3 py-2 border border-[var(--color-primary)] rounded bg-transparent text-[var(--color-primary)] placeholder:text-gray-400 focus:outline-none transition-colors text-sm'
  const labelClass = 'text-xs font-medium text-[var(--color-primary)] uppercase mb-1'

  // if (!wallet.connected) {
  //   return (
  //     <div className="items-center">
  //       <p className="text-xl">Please connect your wallet</p>
  //     </div>
  //   )
  // }

  return (
    <div className="items-center">
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tokenMint" className={labelClass}>
                Token Mint Address
              </label>
              <input
                id="tokenMint"
                name="tokenMint"
                value={formData.tokenMint}
                onChange={handleInputChange}
                placeholder="Token mint address"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="recipient" className={labelClass}>
                Recipient Address
              </label>
              <input
                id="recipient"
                name="recipient"
                value={formData.recipient}
                onChange={handleInputChange}
                placeholder="Recipient address"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="gateway" className={labelClass}>
                Gateway Address
              </label>
              {gatewaysLoading ? (
                <div className="flex items-center justify-center h-10 border border-[var(--color-primary)] rounded">
                  <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <select
                  id="gateway"
                  name="gateway"
                  value={formData.gateway}
                  onChange={handleInputChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select gateway</option>
                  {gateways.map((gateway, index) => (
                    <option key={index} value={gateway.publicKey.toString()}>
                      {truncateAddress(gateway.publicKey.toString())} - {gateway.account.gatewayFeeBps} bps
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="amount" className={labelClass}>
                Amount (base units)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="e.g., 10000000"
                required
                min="1"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="intervalSeconds" className={labelClass}>
                Interval (seconds)
              </label>
              <input
                id="intervalSeconds"
                name="intervalSeconds"
                type="number"
                value={formData.intervalSeconds}
                onChange={handleInputChange}
                placeholder="e.g., 2592000"
                required
                min="1"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="frequency" className={labelClass}>
                Frequency
              </label>
              <select
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className={inputClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semiAnnually">Semi-Annually</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label htmlFor="maxRenewals" className={labelClass}>
                Max Renewals
              </label>
              <input
                id="maxRenewals"
                name="maxRenewals"
                type="number"
                value={formData.maxRenewals}
                onChange={handleInputChange}
                placeholder="Leave empty for unlimited"
                min="1"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="approvalAmount" className={labelClass}>
                Approval Amount
              </label>
              <input
                id="approvalAmount"
                name="approvalAmount"
                type="number"
                value={formData.approvalAmount}
                onChange={handleInputChange}
                placeholder="Token approval amount"
                min="1"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="memo" className={labelClass}>
              Memo (optional)
            </label>
            <input
              id="memo"
              name="memo"
              value={formData.memo}
              onChange={handleInputChange}
              placeholder="Payment description"
              maxLength={64}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="autoRenew"
              name="autoRenew"
              type="checkbox"
              checked={formData.autoRenew}
              onChange={handleInputChange}
              className="w-4 h-4 border border-[var(--color-primary)] rounded"
            />
            <label htmlFor="autoRenew" className="text-sm">
              Auto-renew payments
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !wallet.connected}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-6 border border-[var(--color-primary)] rounded bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-secondary)', fontSize: '14px', textTransform: 'uppercase' }}
          >
            {loading ? 'Creating...' : 'Create Payment Policy'}
          </button>
        </form>
      </div>
    </div>
  )
}
