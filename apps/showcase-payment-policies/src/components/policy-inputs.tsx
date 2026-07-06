import React, { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Target, Zap, Check, X, Loader2, ArrowUpCircle } from 'lucide-react'
import { Select, SelectItem, Input, DatePicker } from '@heroui/react'
import { Button } from '@heroui/react'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { addToast } from '@heroui/react'
import { useSDK, createAndSendTransaction } from '@/lib/client'
import { useNavigate } from 'react-router'
import {
  PaymentFrequencyString,
  type PaymentGateway,
  createMemoBuffer,
  decodeMemo,
  getPaymentFrequency,
} from '@tributary-so/sdk'
import { issuePolicyToken } from '@tributary-so/sdk-react'
import { useAtomValue } from 'jotai'
import { availableTokensAtom, getTokenPrecisionAtom, getTokenSymbolAtom, type Network } from '@/lib/token-store'
import { API_BASE_URL } from '@/constants'
import { today, getLocalTimeZone, fromDate } from '@internationalized/date'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DateValue = any

function dateToDateValue(date: Date): DateValue {
  return fromDate(date, getLocalTimeZone())
}

function dateValueToDate(value: DateValue): Date {
  if ('toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  const date = value as { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }
  return new Date(date.year, date.month - 1, date.day, date.hour || 0, date.minute || 0, date.second || 0)
}

function getNetworkFromRpcEndpoint(rpcEndpoint: string): Network {
  if (rpcEndpoint.includes('devnet')) return 'devnet'
  if (rpcEndpoint.includes('testnet')) return 'testnet'
  if (rpcEndpoint.includes('localhost') || rpcEndpoint.includes('127.0.0.1')) return 'localnet'
  return 'mainnet'
}

export interface PaymentPolicyFormData {
  policyType: 'subscription' | 'milestone' | 'payasyougo' | 'onetime' | 'upto'
  tokenMint: string
  recipient: string
  gateway: string
  memo: string
  approvalAmount: string
  referralCode: string

  amount: string
  frequency: PaymentFrequencyString
  autoRenew: boolean
  maxRenewals: string
  intervalSeconds: string
  milestoneAmounts: string[]
  milestoneDates: Date[]
  dueDateRequired: boolean
  signerType: 'none' | 'gateway' | 'owner' | 'recipient'
  totalMilestones: string
  maxAmountPerPeriod: string
  maxChunkAmount: string
  periodLengthSeconds: string
  // OneTime (ADR-0019)
  oneTimeDueDate: Date | null
  oneTimeExpiryDate: Date | null
  // UpTo (ADR-0020)
  upToValidAfter: Date | null
  upToDeadline: Date | null
}

export interface PaymentPolicyFormProps {
  formData: PaymentPolicyFormData
  onFormDataChange: (newFormData: PaymentPolicyFormProps['formData']) => void
  lineItemsActive?: boolean
}

const POLICY_TYPE_STYLES = {
  subscription: {
    Icon: RefreshCw,
    border: 'border-l-subscription-600',
    bg: 'bg-subscription-50',
  },
  milestone: {
    Icon: Target,
    border: 'border-l-milestone-600',
    bg: 'bg-milestone-50',
  },
  payasyougo: {
    Icon: Zap,
    border: 'border-l-payasyougo-600',
    bg: 'bg-payasyougo-50',
  },
  onetime: {
    Icon: Check,
    border: 'border-l-onetime-600',
    bg: 'bg-onetime-50',
  },
  upto: {
    Icon: ArrowUpCircle,
    border: 'border-l-upto-600',
    bg: 'bg-upto-50',
  },
} as const

export default function PaymentPolicyForm({ formData, onFormDataChange, lineItemsActive }: PaymentPolicyFormProps) {
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
  const getTokenPrecision = useAtomValue(getTokenPrecisionAtom)
  const [isRecipientValid, setIsRecipientValid] = useState(true)
  const [milestoneErrors, setMilestoneErrors] = useState<Record<number, string>>({})
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null)

  const currentNetwork = useMemo(() => getNetworkFromRpcEndpoint(connection.rpcEndpoint), [connection.rpcEndpoint])

  const filteredTokens = useMemo(
    () => availableTokens.filter((token) => !token.network || token.network === currentNetwork),
    [availableTokens, currentNetwork],
  )

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        addToast({ title: 'Error', description: 'Failed to fetch payment gateways: ' + errorMessage, color: 'danger' })
        console.error('Error fetching payment gateways:', error)
      } finally {
        setGatewaysLoading(false)
        setGatewaysLoaded(true)
      }
    }
    if (sdk && !gatewaysLoaded) {
      fetchGateways()
      if (!formData.tokenMint) {
        onFormDataChange({ ...formData, tokenMint: filteredTokens[0]?.address })
      }
    }
  }, [sdk, gatewaysLoaded, formData, onFormDataChange, filteredTokens])

  useEffect(() => {
    setIsRecipientValid(validateRecipientAddress(formData.recipient))
  }, [formData.recipient])

  useEffect(() => {
    const validateReferralCode = async () => {
      if (!formData.referralCode) {
        setReferralCodeValid(null)
        return
      }

      if (!sdk) {
        setReferralCodeValid(null)
        return
      }

      try {
        const isValid = sdk.validateReferralCode(formData.referralCode)
        if (!isValid) {
          setReferralCodeValid(false)
          return
        }

        const gatewayPubkey = new PublicKey(formData.gateway)
        const referralAccount = await sdk.getReferralAccountByCode(gatewayPubkey, formData.referralCode)
        setReferralCodeValid(!!referralAccount)
      } catch (error) {
        console.error('Error validating referral code:', error)
        setReferralCodeValid(false)
      }
    }

    validateReferralCode()
  }, [formData.referralCode, formData.gateway, sdk])

  useEffect(() => {
    if (wallet && wallet.publicKey && !formData.recipient) {
      onFormDataChange({ ...formData, recipient: wallet.publicKey.toString() })
    }
  }, [wallet, formData, onFormDataChange])

  useEffect(() => {
    if (formData.policyType === 'milestone') {
      const errors: Record<number, string> = {}
      const milestoneCount = parseInt(formData.totalMilestones) || 0

      for (let i = 0; i < milestoneCount; i++) {
        const currentDate = formData.milestoneDates[i]
        const prevDate = i > 0 ? formData.milestoneDates[i - 1] : null

        if (currentDate && currentDate <= new Date()) {
          errors[i] = 'Due date must be in the future'
          continue
        }

        if (prevDate && currentDate <= prevDate) {
          errors[i] = `Must be after milestone ${i}`
        }
      }

      setMilestoneErrors(errors)
    }
  }, [formData.policyType, formData.totalMilestones, formData.milestoneDates])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const newData = {
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }
    onFormDataChange(newData)

    if (name === 'recipient') {
      setIsRecipientValid(validateRecipientAddress(value))
    }
  }

  const handleMilestoneDateChange = (index: number, value: DateValue | null) => {
    const newDates = [...formData.milestoneDates]
    newDates[index] = value ? dateValueToDate(value) : new Date()
    onFormDataChange({ ...formData, milestoneDates: newDates })
  }

  const validateRecipientAddress = (address: string) => {
    if (!address) return true
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  const hasMilestoneErrors = () => {
    const milestoneCount = parseInt(formData.totalMilestones) || 0
    for (let i = 0; i < milestoneCount; i++) {
      if (milestoneErrors[i]) return true
    }
    return false
  }

  const handleSubmit = async () => {
    if (!wallet?.publicKey || !wallet?.connected) {
      addToast({ title: 'Error', description: 'Please connect your wallet', color: 'danger' })
      return
    }
    if (!sdk) {
      addToast({ title: 'Error', description: 'SDK not available', color: 'danger' })
      return
    }
    setLoading(true)
    try {
      const memo = createMemoBuffer(formData.memo, 64)
      let approvalAmount: anchor.BN | undefined = undefined
      if (formData.approvalAmount) {
        approvalAmount = new anchor.BN(formData.approvalAmount)
      }

      const tokenMint = new PublicKey(formData.tokenMint)
      const recipient = new PublicKey(formData.recipient)
      const gateway = new PublicKey(formData.gateway)
      let instructions: TransactionInstruction[] = []

      switch (formData.policyType) {
        case 'subscription': {
          const paymentFrequency = getPaymentFrequency(formData.frequency, Number(formData.intervalSeconds))
          const amountBn = parseFloat(formData.amount) * Math.pow(10, getTokenPrecision(formData.tokenMint))
          instructions = await sdk.createSubscription(
            tokenMint,
            recipient,
            gateway,
            new anchor.BN(amountBn),
            formData.autoRenew,
            formData.maxRenewals ? parseInt(formData.maxRenewals) : null,
            paymentFrequency,
            memo,
            undefined,
            approvalAmount,
            undefined,
            formData.referralCode || undefined,
          )
          break
        }
        case 'milestone': {
          const validMilestones = formData.milestoneAmounts
            .map((amount, index) => ({ amount, date: formData.milestoneDates[index] }))
            .filter((m) => m.amount && parseFloat(m.amount) > 0 && m.date && m.date.getTime() > 0)

          const milestoneAmounts = validMilestones.map(
            (m) => new anchor.BN(parseFloat(m.amount) * Math.pow(10, getTokenPrecision(formData.tokenMint))),
          )
          const milestoneTimestamps = validMilestones.map((m) => new anchor.BN(Math.floor(m.date.getTime() / 1000)))

          if (milestoneAmounts.length === 0) {
            throw new Error('At least one milestone amount is required')
          }

          const signerValue =
            {
              none: 0,
              gateway: 2,
              owner: 4,
              recipient: 8,
            }[formData.signerType] || 0
          const releaseCondition = (formData.dueDateRequired ? 1 : 0) | signerValue

          instructions = await sdk.createMilestone(
            tokenMint,
            recipient,
            gateway,
            milestoneAmounts,
            milestoneTimestamps,
            releaseCondition,
            memo,
            approvalAmount,
            undefined,
            formData.referralCode || undefined,
          )
          break
        }
        case 'payasyougo': {
          const maxAmountPerPeriod =
            parseFloat(formData.maxAmountPerPeriod) * Math.pow(10, getTokenPrecision(formData.tokenMint))
          const maxChunkAmount =
            parseFloat(formData.maxChunkAmount) * Math.pow(10, getTokenPrecision(formData.tokenMint))
          const periodLengthSeconds = parseInt(formData.periodLengthSeconds)

          if (maxAmountPerPeriod <= 0) {
            throw new Error('Max amount per period must be greater than 0')
          }
          if (maxChunkAmount <= 0) {
            throw new Error('Max chunk amount must be greater than 0')
          }
          if (periodLengthSeconds <= 0) {
            throw new Error('Period length must be greater than 0')
          }

          instructions = await sdk.createPayAsYouGo(
            tokenMint,
            recipient,
            gateway,
            new anchor.BN(maxAmountPerPeriod),
            new anchor.BN(maxChunkAmount),
            new anchor.BN(periodLengthSeconds),
            memo,
            approvalAmount,
            formData.referralCode || undefined,
          )
          break
        }
        case 'onetime': {
          const amountRaw = parseFloat(formData.amount) * Math.pow(10, getTokenPrecision(formData.tokenMint))
          if (amountRaw <= 0) throw new Error('Amount must be greater than 0')
          const dueDate =
            formData.oneTimeDueDate != null ? new anchor.BN(Math.floor(formData.oneTimeDueDate.getTime() / 1000)) : null
          const expiryDate =
            formData.oneTimeExpiryDate != null
              ? new anchor.BN(Math.floor(formData.oneTimeExpiryDate.getTime() / 1000))
              : null
          instructions = await sdk.createOneTimePayment(
            tokenMint,
            recipient,
            gateway,
            new anchor.BN(amountRaw),
            memo,
            dueDate,
            expiryDate,
            approvalAmount,
            formData.referralCode || undefined,
          )
          break
        }
        case 'upto': {
          const maxAmountRaw = parseFloat(formData.amount) * Math.pow(10, getTokenPrecision(formData.tokenMint))
          if (maxAmountRaw <= 0) throw new Error('Max amount must be greater than 0')
          if (!formData.upToDeadline) throw new Error('Deadline is required for Up-to policies')
          const nowSec = Math.floor(Date.now() / 1000)
          const deadlineSec = Math.floor(formData.upToDeadline.getTime() / 1000)
          if (deadlineSec <= nowSec) throw new Error('Deadline must be in the future')
          const validAfter =
            formData.upToValidAfter != null ? new anchor.BN(Math.floor(formData.upToValidAfter.getTime() / 1000)) : null
          if (validAfter && validAfter.gte(new anchor.BN(deadlineSec))) {
            throw new Error('Deadline must be after valid-after')
          }
          instructions = await sdk.createUpToAuthorization(
            tokenMint,
            recipient,
            gateway,
            new anchor.BN(maxAmountRaw),
            new anchor.BN(deadlineSec),
            memo,
            validAfter,
            approvalAmount,
            formData.referralCode || undefined,
          )
          break
        }
        default:
          throw new Error('Invalid policy type selected')
      }

      const txid = await createAndSendTransaction(instructions, wallet, connection)
      console.log(txid)
      addToast({ title: 'Success', description: 'Payment policy created successfully!', color: 'success' })

      // Issue JWT and redirect to the in-app success page (mirrors
      // apps/checkout/src/components/checkout-form.tsx:82-94). Best-effort:
      // a JWT failure does NOT roll back the on-chain create.
      try {
        const { token } = await issuePolicyToken({
          walletPublicKey: wallet.publicKey,
          recipient,
          tokenMint,
          apiBaseUrl: API_BASE_URL,
          trackingId: formData.memo || undefined,
        })
        navigate(`/success?token=${encodeURIComponent(token)}`)
        return
      } catch (jwtError) {
        console.warn('Failed to issue JWT after policy create:', jwtError)
        // Fall back to home after a short delay.
        setTimeout(() => navigate('/'), 3000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      addToast({ title: 'Error', description: 'Failed to create payment policy: ' + errorMessage, color: 'danger' })
      console.error('Error creating policy:', err)
    } finally {
      setLoading(false)
    }
  }

  const policyStyle = POLICY_TYPE_STYLES[formData.policyType]

  return (
    <div className="max-w-[700px] space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <policyStyle.Icon className="w-5 h-5" />
        <span className="font-semibold text-foreground uppercase text-sm tracking-wide">
          {formData.policyType === 'payasyougo'
            ? 'Pay-as-you-go'
            : formData.policyType.charAt(0).toUpperCase() + formData.policyType.slice(1)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {formData.policyType === 'subscription' && 'Recurring payments at fixed intervals'}
        {formData.policyType === 'milestone' && 'Stage-based payments with due dates'}
        {formData.policyType === 'payasyougo' && 'Usage-based payments with spending limits'}
        {formData.policyType === 'onetime' &&
          'Single-shot policy with full gateway lifecycle (ADR-0019). Distinct from direct transfer.'}
        {formData.policyType === 'upto' &&
          'Single-use variable-amount authorization, caller-settled (x402 upto, ADR-0020).'}
      </p>

      <div className="max-w-3xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="policyType"
              className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
            >
              Policy Type
            </label>
            <Select
              id="policyType"
              selectedKeys={formData.policyType ? [formData.policyType] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as PaymentPolicyFormData['policyType']
                onFormDataChange({ ...formData, policyType: selectedKey })
              }}
              placeholder="Select policy type"
              className="w-full"
            >
              <SelectItem key="subscription">Subscription</SelectItem>
              <SelectItem key="milestone">Milestone</SelectItem>
              <SelectItem key="payasyougo">Pay-as-you-go</SelectItem>
              <SelectItem key="onetime">One-time policy</SelectItem>
              <SelectItem key="upto">Up-to authorization</SelectItem>
            </Select>
          </div>

          <div>
            <label htmlFor="gateway" className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1">
              Processor
            </label>
            {gatewaysLoading ? (
              <div className="flex items-center justify-center h-10 border border-border ">
                <Loader2 className="w-4 h-4 text-subscription-600 animate-spin" />
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
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label
              htmlFor="tokenMint"
              className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
            >
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
              {filteredTokens.map((token) => (
                <SelectItem key={token.address} description={token.name ?? 'No token name'}>
                  {token.symbol}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor="recipient"
              className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
            >
              Recipient Address
            </label>
            <Input
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleInputChange}
              placeholder="Recipient address"
              required
              className={`w-full ${!isRecipientValid ? 'border-overdue-500' : ''}`}
              isInvalid={!isRecipientValid}
              errorMessage={!isRecipientValid ? 'Invalid Solana address' : undefined}
            />
          </div>
        </div>

        {formData.policyType === 'subscription' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
              >
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
                step="0.00000001"
                min="0.00000001"
                isDisabled={lineItemsActive}
                className="w-full"
                endContent={
                  formData.tokenMint &&
                  getTokenSymbol(formData.tokenMint) && (
                    <div className="pointer-events-none flex items-center">
                      <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                    </div>
                  )
                }
              />
              {lineItemsActive && (
                <p className="text-xs text-completed-600 mt-1">
                  Amount is computed from checkout line items. Cannot edit directly.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="frequency"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Frequency
                </label>
                <Select
                  id="frequency"
                  name="frequency"
                  selectedKeys={formData.frequency ? [formData.frequency] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as PaymentFrequencyString
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
                <label
                  htmlFor="intervalSeconds"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
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
            </div>
          </div>
        )}

        {formData.policyType === 'milestone' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="totalMilestones"
                className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
              >
                Total Milestones
              </label>
              <Select
                id="totalMilestones"
                name="totalMilestones"
                selectedKeys={formData.totalMilestones ? [formData.totalMilestones] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string
                  const count = parseInt(selectedKey)
                  const newAmounts = formData.milestoneAmounts.slice(0, count).concat(Array(4 - count).fill(''))
                  const baseDate = new Date()
                  baseDate.setDate(baseDate.getDate() + 1)
                  const newDates = Array.from({ length: 4 }, (_, i) => {
                    if (i >= count) return new Date()
                    const date = new Date(baseDate)
                    date.setDate(date.getDate() + i)
                    return date
                  })
                  onFormDataChange({
                    ...formData,
                    totalMilestones: selectedKey,
                    milestoneAmounts: newAmounts,
                    milestoneDates: newDates,
                  })
                }}
                className="w-full"
              >
                <SelectItem key="1">1</SelectItem>
                <SelectItem key="2">2</SelectItem>
                <SelectItem key="3">3</SelectItem>
                <SelectItem key="4">4</SelectItem>
              </Select>
            </div>

            {formData.milestoneAmounts.slice(0, parseInt(formData.totalMilestones)).map((amount, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor={`milestoneAmount${index}`}
                    className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                  >
                    Milestone {index + 1} Amount
                  </label>
                  <Input
                    id={`milestoneAmount${index}`}
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const newAmounts = [...formData.milestoneAmounts]
                      newAmounts[index] = e.target.value
                      onFormDataChange({ ...formData, milestoneAmounts: newAmounts })
                    }}
                    placeholder="Amount"
                    step="0.00000001"
                    min="0"
                    className="w-full"
                    endContent={
                      formData.tokenMint &&
                      getTokenSymbol(formData.tokenMint) && (
                        <div className="pointer-events-none flex items-center">
                          <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                        </div>
                      )
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor={`milestoneDate${index}`}
                    className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                  >
                    Due Date
                  </label>
                  <DatePicker
                    label="Due Date"
                    granularity="minute"
                    value={
                      formData.milestoneDates[index]
                        ? (dateToDateValue(formData.milestoneDates[index]) as unknown as DateValue)
                        : undefined
                    }
                    onChange={(value) => handleMilestoneDateChange(index, value)}
                    minValue={today(getLocalTimeZone()) as unknown as DateValue}
                    isInvalid={!!milestoneErrors[index]}
                    errorMessage={milestoneErrors[index]}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dueDateRequired"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Due Date Required
                </label>
                <Select
                  id="dueDateRequired"
                  name="dueDateRequired"
                  selectedKeys={formData.dueDateRequired ? ['true'] : ['false']}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string
                    onFormDataChange({ ...formData, dueDateRequired: selectedKey === 'true' })
                  }}
                  className="w-full"
                >
                  <SelectItem key="true" description="Payment can only be released after due date">
                    Yes
                  </SelectItem>
                  <SelectItem key="false" description="No time restriction">
                    No
                  </SelectItem>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="signerType"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Signer Required
                </label>
                <Select
                  id="signerType"
                  name="signerType"
                  selectedKeys={formData.signerType ? [formData.signerType] : []}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as 'none' | 'gateway' | 'owner' | 'recipient'
                    onFormDataChange({ ...formData, signerType: selectedKey })
                  }}
                  className="w-full"
                >
                  <SelectItem key="none" description="Anyone can trigger the payment">
                    None
                  </SelectItem>
                  <SelectItem key="gateway" description="Gateway authority must sign">
                    Gateway Authority
                  </SelectItem>
                  <SelectItem key="owner" description="Policy owner must sign">
                    Policy Owner
                  </SelectItem>
                  <SelectItem key="recipient" description="Recipient must sign">
                    Recipient
                  </SelectItem>
                </Select>
              </div>
            </div>
          </div>
        )}

        {formData.policyType === 'payasyougo' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="maxAmountPerPeriod"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Max Amount Per Period
                </label>
                <Input
                  id="maxAmountPerPeriod"
                  name="maxAmountPerPeriod"
                  type="number"
                  value={formData.maxAmountPerPeriod}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  step="0.00000001"
                  min="0"
                  className="w-full"
                  endContent={
                    formData.tokenMint &&
                    getTokenSymbol(formData.tokenMint) && (
                      <div className="pointer-events-none flex items-center">
                        <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                      </div>
                    )
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="maxChunkAmount"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Max Chunk Amount
                </label>
                <Input
                  id="maxChunkAmount"
                  name="maxChunkAmount"
                  type="number"
                  value={formData.maxChunkAmount}
                  onChange={handleInputChange}
                  placeholder="e.g., 10"
                  step="0.00000001"
                  min="0"
                  className="w-full"
                  endContent={
                    formData.tokenMint &&
                    getTokenSymbol(formData.tokenMint) && (
                      <div className="pointer-events-none flex items-center">
                        <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                      </div>
                    )
                  }
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="periodLengthSeconds"
                className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
              >
                Period Length (seconds)
              </label>
              <Input
                id="periodLengthSeconds"
                name="periodLengthSeconds"
                type="number"
                value={formData.periodLengthSeconds}
                onChange={handleInputChange}
                placeholder="e.g., 2592000 (30 days)"
                min="1"
                className="w-full"
              />
            </div>
          </div>
        )}

        {formData.policyType === 'onetime' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
              >
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
                step="0.00000001"
                min="0.00000001"
                className="w-full"
                endContent={
                  formData.tokenMint &&
                  getTokenSymbol(formData.tokenMint) && (
                    <div className="pointer-events-none flex items-center">
                      <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                    </div>
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="oneTimeDueDate"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Due Date (optional)
                </label>
                <DatePicker
                  label="Due Date"
                  granularity="minute"
                  value={
                    formData.oneTimeDueDate
                      ? (dateToDateValue(formData.oneTimeDueDate) as unknown as DateValue)
                      : undefined
                  }
                  onChange={(value) =>
                    onFormDataChange({
                      ...formData,
                      oneTimeDueDate: value ? dateValueToDate(value) : null,
                    })
                  }
                  minValue={today(getLocalTimeZone()) as unknown as DateValue}
                />
                <p className="text-xs text-muted-foreground mt-1">Blank = immediate execution.</p>
              </div>
              <div>
                <label
                  htmlFor="oneTimeExpiryDate"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Expiry Date (optional)
                </label>
                <DatePicker
                  label="Expiry Date"
                  granularity="minute"
                  value={
                    formData.oneTimeExpiryDate
                      ? (dateToDateValue(formData.oneTimeExpiryDate) as unknown as DateValue)
                      : undefined
                  }
                  onChange={(value) =>
                    onFormDataChange({
                      ...formData,
                      oneTimeExpiryDate: value ? dateValueToDate(value) : null,
                    })
                  }
                  minValue={today(getLocalTimeZone()) as unknown as DateValue}
                />
                <p className="text-xs text-muted-foreground mt-1">Blank = never expires.</p>
              </div>
            </div>
          </div>
        )}

        {formData.policyType === 'upto' && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
              >
                Max Amount (ceiling)
              </label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="e.g., 50"
                required
                step="0.00000001"
                min="0.00000001"
                className="w-full"
                endContent={
                  formData.tokenMint &&
                  getTokenSymbol(formData.tokenMint) && (
                    <div className="pointer-events-none flex items-center">
                      <span className="text-muted-foreground text-small">{getTokenSymbol(formData.tokenMint)}</span>
                    </div>
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Resource server settles the actual used amount, bounded by this ceiling.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="upToValidAfter"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Valid After (optional)
                </label>
                <DatePicker
                  label="Valid After"
                  granularity="minute"
                  value={
                    formData.upToValidAfter
                      ? (dateToDateValue(formData.upToValidAfter) as unknown as DateValue)
                      : undefined
                  }
                  onChange={(value) =>
                    onFormDataChange({
                      ...formData,
                      upToValidAfter: value ? dateValueToDate(value) : null,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">Blank = immediate.</p>
              </div>
              <div>
                <label
                  htmlFor="upToDeadline"
                  className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
                >
                  Deadline (required)
                </label>
                <DatePicker
                  label="Deadline"
                  granularity="minute"
                  value={
                    formData.upToDeadline ? (dateToDateValue(formData.upToDeadline) as unknown as DateValue) : undefined
                  }
                  onChange={(value) =>
                    onFormDataChange({
                      ...formData,
                      upToDeadline: value ? dateValueToDate(value) : null,
                    })
                  }
                  minValue={today(getLocalTimeZone()) as unknown as DateValue}
                />
                <p className="text-xs text-muted-foreground mt-1">Hard expiry. Must be in the future.</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="referralCode"
            className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1"
          >
            Referral Code (optional)
          </label>
          <Input
            id="referralCode"
            name="referralCode"
            value={formData.referralCode}
            onChange={handleInputChange}
            placeholder="e.g., ABC123"
            maxLength={6}
            className={`w-full ${
              referralCodeValid === false
                ? 'border-overdue-500'
                : referralCodeValid === true
                ? 'border-status-active-500'
                : ''
            }`}
            isInvalid={referralCodeValid === false}
            errorMessage={referralCodeValid === false ? 'Invalid referral code' : undefined}
            endContent={
              referralCodeValid !== null ? (
                <div className="pointer-events-none flex items-center">
                  {referralCodeValid ? (
                    <span className="text-status-active-600 text-small flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Valid
                    </span>
                  ) : (
                    <span className="text-overdue-600 text-small flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Invalid
                    </span>
                  )}
                </div>
              ) : null
            }
          />
        </div>

        <div className="mt-4">
          <label htmlFor="memo" className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1">
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
          isDisabled={
            loading ||
            !wallet?.connected ||
            !isRecipientValid ||
            !formData.tokenMint ||
            !formData.gateway ||
            (formData.referralCode && referralCodeValid === false) ||
            (formData.policyType === 'subscription' && !formData.amount) ||
            (formData.policyType === 'milestone' && hasMilestoneErrors()) ||
            (formData.policyType === 'payasyougo' &&
              (!formData.maxAmountPerPeriod || !formData.maxChunkAmount || !formData.periodLengthSeconds)) ||
            (formData.policyType === 'onetime' && !formData.amount) ||
            (formData.policyType === 'upto' && (!formData.amount || !formData.upToDeadline))
          }
          className="w-full mt-6 text-sm uppercase text-primary-foreground bg-primary hover:bg-primary/90"
          color="primary"
          isLoading={loading}
          onClick={handleSubmit}
        >
          {loading ? 'Creating...' : 'Create Payment Policy'}
        </Button>
      </div>
    </div>
  )
}
