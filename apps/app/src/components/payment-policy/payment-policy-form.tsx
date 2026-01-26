import React, { useState, useEffect, useMemo } from 'react'
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
import { useAtomValue } from 'jotai'
import { availableTokensAtom, getTokenPrecisionAtom, getTokenSymbolAtom, type Network } from '@/lib/token-store'
import { today, getLocalTimeZone, fromDate } from '@internationalized/date'

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
  policyType: 'subscription' | 'milestone' | 'payasyougo'
  tokenMint: string
  recipient: string
  gateway: string
  memo: string
  approvalAmount: string
  referralCode: string

  // SUbscription specific fields
  amount: string
  frequency: PaymentFrequencyString
  autoRenew: boolean
  maxRenewals: string
  intervalSeconds: string
  // Milestone specific fields
  milestoneAmounts: string[]
  milestoneDates: Date[]
  dueDateRequired: boolean
  signerType: 'none' | 'gateway' | 'owner' | 'recipient'
  totalMilestones: string
  // Pay-as-you-go specific fields
  maxAmountPerPeriod: string
  maxChunkAmount: string
  periodLengthSeconds: string
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
        setReferralCodeValid(null) // No code entered, neutral state
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

        // Check if referral code exists for the selected gateway
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
    if (wallet.publicKey && !formData.recipient) {
      onFormDataChange({ ...formData, recipient: wallet.publicKey.toString() })
    }
  }, [wallet.publicKey, formData, onFormDataChange])

  // Validate milestone dates for chronological ordering
  useEffect(() => {
    if (formData.policyType === 'milestone') {
      const errors: Record<number, string> = {}
      const milestoneCount = parseInt(formData.totalMilestones) || 0

      for (let i = 0; i < milestoneCount; i++) {
        const currentDate = formData.milestoneDates[i]
        const prevDate = i > 0 ? formData.milestoneDates[i - 1] : null

        // Validate against current time
        if (currentDate && currentDate <= new Date()) {
          errors[i] = 'Due date must be in the future'
          continue
        }

        // Validate chronological ordering
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

    // Validate recipient address
    if (name === 'recipient') {
      setIsRecipientValid(validateRecipientAddress(value))
    }

    // Validate referral code
    if (name === 'referralCode') {
      // Validation happens in useEffect, just update state here
    }
  }

  const handleMilestoneDateChange = (index: number, value: DateValue | null) => {
    const newDates = [...formData.milestoneDates]
    newDates[index] = value ? dateValueToDate(value) : new Date()
    onFormDataChange({ ...formData, milestoneDates: newDates })
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

  const hasMilestoneErrors = () => {
    const milestoneCount = parseInt(formData.totalMilestones) || 0
    for (let i = 0; i < milestoneCount; i++) {
      if (milestoneErrors[i]) return true
    }
    return false
  }

  const handleSubmit = async () => {
    if (!wallet.publicKey || !wallet.connected) {
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

          // Calculate release condition bitmap
          const signerValue =
            {
              none: 0,
              gateway: 2, // 0b0010
              owner: 4, // 0b0100
              recipient: 8, // 0b1000
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
        default:
          throw new Error('Invalid policy type selected')
      }

      await createAndSendTransaction(instructions, wallet, connection)
      addToast({ title: 'Success', description: 'Payment policy created successfully!', color: 'success' })
      setTimeout(() => navigate('/account'), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      addToast({ title: 'Error', description: 'Failed to create payment policy: ' + errorMessage, color: 'danger' })
      console.error('Error creating policy:', err)
    } finally {
      setLoading(false)
    }
  }

  const labelClass = 'text-xs font-medium text-[var(--color-primary)] uppercase mb-1'

  return (
    <div className="max-w-[700px] space-y-4">
      <p className="text-sm text-gray-600">Create a new recurring payment policy and get integration code.</p>
      <div className="items-center">
        <div className="max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="policyType" className={labelClass}>
                Policy Type
              </label>
              <Select
                id="policyType"
                selectedKeys={formData.policyType ? [formData.policyType] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as 'subscription' | 'milestone' | 'payasyougo'
                  onFormDataChange({ ...formData, policyType: selectedKey })
                }}
                placeholder="Select policy type"
                className="w-full"
              >
                <SelectItem key="subscription">Subscription</SelectItem>
                <SelectItem key="milestone">Milestone</SelectItem>
                <SelectItem key="payasyougo">Pay-as-you-go</SelectItem>
              </Select>
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
          </div>

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
                {filteredTokens.map((token) => (
                  <SelectItem key={token.address} description={token.name ?? 'No token name'}>
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
          </div>
          <div>
            {/* Subscription-specific fields */}
            {formData.policyType === 'subscription' && (
              <>
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
                    step="0.00000001"
                    min="0.00000001"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="frequency" className={labelClass}>
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
                </div>
              </>
            )}
          </div>

          {/* Milestone-specific fields */}
          {formData.policyType === 'milestone' && (
            <>
              <div>
                <label htmlFor="totalMilestones" className={labelClass}>
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
                    <label htmlFor={`milestoneAmount${index}`} className={labelClass}>
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
                            <span className="text-default-400 text-small">{getTokenSymbol(formData.tokenMint)}</span>
                          </div>
                        )
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`milestoneDate${index}`} className={labelClass}>
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
                  <label htmlFor="dueDateRequired" className={labelClass}>
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
                  <label htmlFor="signerType" className={labelClass}>
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
            </>
          )}

          {/* Pay-as-you-go specific fields */}
          {formData.policyType === 'payasyougo' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxAmountPerPeriod" className={labelClass}>
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
                          <span className="text-default-400 text-small">{getTokenSymbol(formData.tokenMint)}</span>
                        </div>
                      )
                    }
                  />
                </div>
                <div>
                  <label htmlFor="maxChunkAmount" className={labelClass}>
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
                          <span className="text-default-400 text-small">{getTokenSymbol(formData.tokenMint)}</span>
                        </div>
                      )
                    }
                  />
                </div>
              </div>
              <div>
                <label htmlFor="periodLengthSeconds" className={labelClass}>
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
            </>
          )}

          <div>
            <label htmlFor="referralCode" className={labelClass}>
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
                referralCodeValid === false ? 'border-red-500' : referralCodeValid === true ? 'border-green-500' : ''
              }`}
              isInvalid={referralCodeValid === false}
              errorMessage={referralCodeValid === false ? 'Invalid referral code' : undefined}
              endContent={
                referralCodeValid !== null ? (
                  <div className="pointer-events-none flex items-center">
                    {referralCodeValid ? (
                      <span className="text-green-500 text-small">✓ Valid</span>
                    ) : (
                      <span className="text-red-500 text-small">✗ Invalid</span>
                    )}
                  </div>
                ) : null
              }
            />
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
            isDisabled={
              loading ||
              !wallet.connected ||
              !isRecipientValid ||
              !formData.tokenMint ||
              !formData.gateway ||
              (formData.referralCode && referralCodeValid === false) ||
              (formData.policyType === 'subscription' && !formData.amount) ||
              (formData.policyType === 'milestone' && hasMilestoneErrors()) ||
              (formData.policyType === 'payasyougo' &&
                (!formData.maxAmountPerPeriod || !formData.maxChunkAmount || !formData.periodLengthSeconds))
            }
            className="w-full mt-6 text-sm uppercase text-white"
            color="primary"
            isLoading={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Creating...' : 'Create Payment Policy'}
          </Button>
        </div>
      </div>
    </div>
  )
}
