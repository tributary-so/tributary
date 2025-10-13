import React, { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Spinner } from '@heroui/react'
import { toast } from 'sonner'
import { useSDK } from '@/lib/client'
import { type PolicyType, type PaymentFrequency, type PaymentGateway, createMemoBuffer } from '@tributary-so/sdk'

interface PaymentPolicyFormProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export default function PaymentPolicyForm({ onSuccess, onError }: PaymentPolicyFormProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gateway state
  const [gateways, setGateways] = useState<Array<{ publicKey: PublicKey; account: PaymentGateway }>>([])
  const [gatewaysLoading, setGatewaysLoading] = useState(false)
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    tokenMint: '',
    recipient: '',
    gateway: '',
    amount: '',
    intervalSeconds: '',
    memo: '',
    frequency: 'daily' as keyof PaymentFrequency,
    autoRenew: true,
    maxRenewals: '',
    startTime: '',
    approvalAmount: '',
  })

  // Fetch gateways on component mount
  useEffect(() => {
    const fetchGateways = async () => {
      if (!sdk || gatewaysLoaded) {
        return
      }

      try {
        setGatewaysLoading(true)
        const gatewayData = await sdk.getAllPaymentGateway()
        setGateways(gatewayData)
        setGatewaysLoaded(true)
      } catch (error) {
        console.error('Error fetching payment gateways:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to fetch payment gateways')
      } finally {
        setGatewaysLoading(false)
      }
    }

    if (sdk && !gatewaysLoaded) {
      fetchGateways()
    }
  }, [sdk, gatewaysLoaded])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const truncateAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const validateForm = () => {
    const required = ['tokenMint', 'recipient', 'gateway', 'amount', 'intervalSeconds']
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        throw new Error(`${field} is required`)
      }
    }

    // Validate public keys
    try {
      new PublicKey(formData.tokenMint)
      new PublicKey(formData.recipient)
      new PublicKey(formData.gateway)
    } catch {
      throw new Error('Invalid public key format')
    }

    // Validate numbers
    if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      throw new Error('Amount must be a positive number')
    }
    if (isNaN(Number(formData.intervalSeconds)) || Number(formData.intervalSeconds) <= 0) {
      throw new Error('Interval seconds must be a positive number')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Please connect your wallet')
      toast.error('Wallet not connected')
      return
    }

    if (!sdk) {
      setError('SDK not available')
      toast.error('SDK not available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      validateForm()

      // Create policy type
      const policyType: PolicyType = {
        subscription: {
          amount: new anchor.BN(formData.amount),
          intervalSeconds: new anchor.BN(formData.intervalSeconds),
          autoRenew: formData.autoRenew,
          maxRenewals: formData.maxRenewals ? parseInt(formData.maxRenewals) : null,
          padding: Array(8).fill(new anchor.BN(0)),
        },
      }

      // Create payment frequency
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

      // Create memo buffer
      const memo = createMemoBuffer(formData.memo, 64)

      // Parse start time if provided
      let startTime: anchor.BN | null = null
      if (formData.startTime) {
        startTime = new anchor.BN(Math.floor(new Date(formData.startTime).getTime() / 1000))
      }

      // Parse approval amount if provided
      let approvalAmount: anchor.BN | undefined = undefined
      if (formData.approvalAmount) {
        approvalAmount = new anchor.BN(formData.approvalAmount)
      }

      // Get instructions using the new method
      const instructions = await sdk.createPaymentPolicyWithUser(
        new PublicKey(formData.tokenMint),
        new PublicKey(formData.recipient),
        new PublicKey(formData.gateway),
        policyType,
        paymentFrequency,
        memo,
        startTime,
        approvalAmount,
      )

      // Create and send transaction
      const { Transaction } = await import('@solana/web3.js')
      const transaction = new Transaction()
      instructions.forEach((ix) => transaction.add(ix))
      transaction.feePayer = wallet.publicKey

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      const signedTx = await wallet.signTransaction(transaction)
      const txId = await connection.sendRawTransaction(signedTx.serialize())

      await connection.confirmTransaction({
        signature: txId,
        blockhash,
        lastValidBlockHeight,
      })

      toast.success('Payment policy created successfully!', {
        description: `Transaction: ${txId}`,
      })

      // Reset form
      setFormData({
        tokenMint: '',
        recipient: '',
        gateway: '',
        amount: '',
        intervalSeconds: '',
        memo: '',
        frequency: 'daily',
        autoRenew: true,
        maxRenewals: '',
        startTime: '',
        approvalAmount: '',
      })

      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      toast.error('Failed to create payment policy', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Payment Policy</h2>
        <p className="text-gray-600">
          Create a new recurring payment policy. If you don't have a user payment account for this token, it will be
          created automatically.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenMint">Token Mint Address</Label>
            <Input
              id="tokenMint"
              name="tokenMint"
              value={formData.tokenMint}
              onChange={handleInputChange}
              placeholder="Enter token mint public key"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleInputChange}
              placeholder="Enter recipient public key"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway">Gateway Address</Label>
            {gatewaysLoading ? (
              <div className="flex items-center space-x-2 p-2 border rounded-md">
                <Spinner size="sm" />
                <span className="text-gray-500">Loading gateways...</span>
              </div>
            ) : (
              <select
                id="gateway"
                name="gateway"
                value={formData.gateway}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select a gateway</option>
                {gateways.map((gateway, index) => (
                  <option key={index} value={gateway.publicKey.toString()}>
                    {truncateAddress(gateway.publicKey.toString())} - {gateway.account.gatewayFeeBps} bps
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Amount in token base units"
              required
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervalSeconds">Interval (seconds)</Label>
            <Input
              id="intervalSeconds"
              name="intervalSeconds"
              type="number"
              value={formData.intervalSeconds}
              onChange={handleInputChange}
              placeholder="Payment interval in seconds"
              required
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Payment Frequency</Label>
            <select
              id="frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semiAnnually">Semi-Annually</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRenewals">Max Renewals (optional)</Label>
            <Input
              id="maxRenewals"
              name="maxRenewals"
              type="number"
              value={formData.maxRenewals}
              onChange={handleInputChange}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time (optional)</Label>
            <Input
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="approvalAmount">Delegate Approval Amount (optional)</Label>
            <Input
              id="approvalAmount"
              name="approvalAmount"
              type="number"
              value={formData.approvalAmount}
              onChange={handleInputChange}
              placeholder="Token amount to approve for delegate"
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo">Memo (optional)</Label>
          <Input
            id="memo"
            name="memo"
            value={formData.memo}
            onChange={handleInputChange}
            placeholder="Payment description or memo"
            maxLength={64}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="autoRenew"
            name="autoRenew"
            type="checkbox"
            checked={formData.autoRenew}
            onChange={handleInputChange}
            className="rounded"
          />
          <Label htmlFor="autoRenew">Auto-renew payments</Label>
        </div>

        <Button type="submit" disabled={loading || !wallet.connected} className="w-full">
          {loading ? 'Creating Payment Policy...' : 'Create Payment Policy'}
        </Button>
      </form>
    </div>
  )
}
