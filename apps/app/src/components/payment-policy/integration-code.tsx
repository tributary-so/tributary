import { useState, useEffect } from 'react'
import {
  SubscriptionButton,
  SubscriptionButtonWithCode,
  PaymentInterval,
  MilestoneButton,
  PayAsYouGoButton,
} from '@tributary-so/sdk-react'
import { Copy, Check, Trash2 } from '../../icons'
import { PaymentPolicyFormData } from './payment-policy-form'
import { getTokenPrecisionAtom } from '@/lib/token-store'
import { useAtomValue } from 'jotai'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

interface LineItem {
  description: string
  unitPrice: number
  quantity: number
}

interface EncodedSessionData {
  tm: string
  r: string
  g: string
  a: string
  ar: boolean
  mr: string
  pf: string
  st: string
  tid: string
  li: string
  su: string
  cu: string
}

interface IntegrationCodeProps {
  formData: PaymentPolicyFormData
  onLineItemsActive?: (active: boolean) => void
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function calculateReleaseCondition(formData: PaymentPolicyFormData): number {
  const signerValue =
    {
      none: 0,
      gateway: 2,
      owner: 4,
      recipient: 8,
    }[formData.signerType] || 0
  return (formData.dueDateRequired ? 1 : 0) | signerValue
}

function validateAmount(amountStr: string, tokenMint: string, getTokenPrecision: (mint: string) => number): BN {
  const amount = parseFloat(amountStr)
  const validAmount = isNaN(amount) || amount <= 0 ? 10 : amount
  const precision = getTokenPrecision(tokenMint)
  return new BN(validAmount * Math.pow(10, precision))
}

function validatePublicKey(keyStr: string, fallback: string): string {
  try {
    new PublicKey(keyStr)
    return keyStr
  } catch {
    return fallback
  }
}

function getValidatedFormData(formData: PaymentPolicyFormData, getTokenPrecision: (mint: string) => number) {
  const tokenMint = validatePublicKey(formData.tokenMint, 'So11111111111111111111111111111111111111112')
  const recipient = validatePublicKey(formData.recipient, PublicKey.default.toString())
  const gateway = validatePublicKey(formData.gateway, 'AWqqH2c5zKhBUKrme1D28uQooS54HvAeS1ix8nfQ4bEt')
  const amount = validateAmount(formData.amount, tokenMint, getTokenPrecision)
  const memo = formData.memo || ''
  const frequency = formData.frequency || 'weekly'
  const intervalSeconds = parseInt(formData.intervalSeconds) || 604800

  return { tokenMint, recipient, gateway, amount, memo, frequency, intervalSeconds, formData }
}

function getPaymentInterval(
  frequency: string,
  intervalSeconds: number,
): { interval: PaymentInterval; customInterval: number } {
  switch (frequency) {
    case 'daily':
      return { interval: PaymentInterval.Daily, customInterval: 0 }
    case 'weekly':
      return { interval: PaymentInterval.Weekly, customInterval: 0 }
    case 'monthly':
      return { interval: PaymentInterval.Monthly, customInterval: 0 }
    case 'quarterly':
      return { interval: PaymentInterval.Quarterly, customInterval: 0 }
    case 'semiAnnually':
      return { interval: PaymentInterval.SemiAnnually, customInterval: 0 }
    case 'annually':
      return { interval: PaymentInterval.Annually, customInterval: 0 }
    case 'custom':
      return { interval: PaymentInterval.Custom, customInterval: intervalSeconds }
    default:
      return { interval: PaymentInterval.Weekly, customInterval: 0 }
  }
}

function encodeSubscriptionUrl(params: {
  tokenMint: string
  recipient: string
  gateway: string
  amount: number
  autoRenew: boolean
  maxRenewals: number | null
  paymentFrequency: string
  startTime: number | null
  trackingId: string
  lineItems: LineItem[]
  successUrl?: string
  cancelUrl?: string
}): string {
  const data: EncodedSessionData = {
    tm: params.tokenMint,
    r: params.recipient,
    g: params.gateway,
    a: params.amount.toString(),
    ar: params.autoRenew,
    mr: params.maxRenewals?.toString() || 'null',
    pf: params.paymentFrequency,
    st: params.startTime?.toString() || 'null',
    tid: params.trackingId,
    li: params.lineItems ? JSON.stringify(params.lineItems) : '[]',
    su: params.successUrl || 'null',
    cu: params.cancelUrl || 'null',
  }
  const jsonString = JSON.stringify(data)
  const base64 = Buffer.from(jsonString).toString('base64')
  const encoded = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `https://checkout.tributary.so/#/subscribe/${encoded}`
}

function generateTrackingId(): string {
  return `trib_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export default function IntegrationCode({ formData, onLineItemsActive }: IntegrationCodeProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'button' | 'checkout'>('button')
  const [checkoutParams, setCheckoutParams] = useState({
    successUrl: '',
    cancelUrl: '',
    trackingId: '',
    lineItems: [] as LineItem[],
  })
  const getTokenPrecision = useAtomValue(getTokenPrecisionAtom)
  const { connected } = useWallet()

  const validated = getValidatedFormData(formData, getTokenPrecision)
  const { interval, customInterval } = getPaymentInterval(validated.frequency, validated.intervalSeconds)

  const lineItemsActive = checkoutParams.lineItems.length > 0
  const computedAmount = lineItemsActive
    ? checkoutParams.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0

  const validateCheckoutData = (): { valid: boolean; error?: string } => {
    if (!validated.tokenMint || validated.tokenMint.startsWith('So11')) {
      return { valid: false, error: 'Invalid token mint' }
    }
    if (!validated.recipient || validated.recipient.startsWith('1111')) {
      return { valid: false, error: 'Invalid recipient address' }
    }
    if (!validated.gateway || validated.gateway.startsWith('AWqq')) {
      return { valid: false, error: 'Invalid gateway' }
    }
    if (lineItemsActive) {
      const hasEmptyDescription = checkoutParams.lineItems.some((item) => !item.description.trim())
      const hasInvalidPrice = checkoutParams.lineItems.some((item) => item.unitPrice <= 0)
      const hasInvalidQty = checkoutParams.lineItems.some((item) => item.quantity < 1)
      if (hasEmptyDescription) return { valid: false, error: 'All line items need a description' }
      if (hasInvalidPrice) return { valid: false, error: 'All line items need a valid unit price' }
      if (hasInvalidQty) return { valid: false, error: 'All line items need a valid quantity' }
    } else if (validated.formData.policyType === 'subscription' && !parseFloat(validated.formData.amount || '0')) {
      return { valid: false, error: 'Amount is required' }
    }
    return { valid: true }
  }

  const checkoutValidation = validateCheckoutData()

  useEffect(() => {
    onLineItemsActive?.(lineItemsActive)
  }, [lineItemsActive, onLineItemsActive])

  const addLineItem = () => {
    setCheckoutParams({
      ...checkoutParams,
      lineItems: [...checkoutParams.lineItems, { description: '', unitPrice: 0, quantity: 1 }],
    })
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newLineItems = [...checkoutParams.lineItems]
    newLineItems[index] = { ...newLineItems[index], [field]: value }
    setCheckoutParams({ ...checkoutParams, lineItems: newLineItems })
  }

  const removeLineItem = (index: number) => {
    setCheckoutParams({
      ...checkoutParams,
      lineItems: checkoutParams.lineItems.filter((_, i) => i !== index),
    })
  }

  const generateCheckoutUrl = (): string => {
    const amount = computedAmount || parseFloat(validated.formData.amount || '0')

    return encodeSubscriptionUrl({
      tokenMint: validated.tokenMint,
      recipient: validated.recipient,
      gateway: validated.gateway,
      amount,
      autoRenew: validated.formData.autoRenew,
      maxRenewals: validated.formData.maxRenewals ? parseInt(validated.formData.maxRenewals) : null,
      paymentFrequency: validated.frequency,
      startTime: null,
      trackingId: checkoutParams.trackingId || generateTrackingId(),
      lineItems: checkoutParams.lineItems,
      successUrl: checkoutParams.successUrl || undefined,
      cancelUrl: checkoutParams.cancelUrl || undefined,
    })
  }

  const checkoutUrl = generateCheckoutUrl()

  const generateCode = () => {
    switch (validated.formData.policyType) {
      case 'subscription':
        return `import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { PaymentFrequency } from '@tributary-so/sdk'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<SubscriptionButton
  amount={new BN(${validated.amount.toString()})}
  token={new PublicKey('${validated.tokenMint}')}
  recipient={new PublicKey('${validated.recipient}')}
  gateway={new PublicKey('${validated.gateway}')}
  maxRenewals={${validated.formData.maxRenewals || '12'}}
  interval={PaymentInterval.${capitalizeFirst(validated.formData.frequency)}
  ${validated.formData.frequency == 'custom' ? `custom_interval={${validated.intervalSeconds}}\r\n  ` : ''}memo="${
          validated.memo
        }"
  label="Subscribe for $${parseFloat(validated.formData.amount) || 10}/${validated.formData.frequency}"
  executeImmediately={true}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`

      case 'milestone': {
        const milestoneAmounts = validated.formData.milestoneAmounts
          .filter((_, i) => i < parseInt(validated.formData.totalMilestones))
          .map((amount) => parseFloat(amount || '0') * Math.pow(10, getTokenPrecision(validated.tokenMint)))
        const milestoneDates = validated.formData.milestoneDates
          .filter((_, i) => i < parseInt(validated.formData.totalMilestones))
          .map((date) => Math.floor(date.getTime() / 1000))

        return `import { MilestoneButton } from '@tributary-so/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<MilestoneButton
  milestoneAmounts={[${milestoneAmounts.map((a) => `new BN(${a})`).join(', ')}]}
  milestoneTimestamps={[${milestoneDates.map((ts) => `new BN(${ts})`).join(', ')}]}
  releaseCondition={${calculateReleaseCondition(validated.formData)}}
  token={new PublicKey('${validated.tokenMint}')}
  recipient={new PublicKey('${validated.recipient}')}
  gateway={new PublicKey('${validated.gateway}')}
  memo="${validated.memo}"
  label="Create Milestone Payment"
  executeImmediately={true}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`
      }

      case 'payasyougo':
        return `import { PayAsYouGoButton } from '@tributary-so/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<PayAsYouGoButton
  maxAmountPerPeriod={new BN(${
    parseFloat(validated.formData.maxAmountPerPeriod || '0') * Math.pow(10, getTokenPrecision(validated.tokenMint))
  })}
  maxChunkAmount={new BN(${
    parseFloat(validated.formData.maxChunkAmount || '0') * Math.pow(10, getTokenPrecision(validated.tokenMint))
  })}
  periodLengthSeconds={new BN(${validated.formData.periodLengthSeconds || '2592000'})}
  token={new PublicKey('${validated.tokenMint}')}
  recipient={new PublicKey('${validated.recipient}')}
  gateway={new PublicKey('${validated.gateway}')}
  memo="${validated.memo}"
  label="Create Pay-as-you-go"
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`

      default:
        return '// Invalid policy type'
    }
  }

  const jsCode = generateCode()
  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="max-w-[600px] space-y-4">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setActiveTab('button')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'button'
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Button Code
        </button>
        <button
          onClick={() => setActiveTab('checkout')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'checkout'
              ? 'bg-[var(--color-primary)] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Checkout Link
        </button>
      </div>

      {activeTab === 'button' ? (
        <>
          <p className="text-sm text-gray-600">Copy/Paste react code below to get your own custom button!</p>

          <div className="flex gap-6 justify-center">
            {connected &&
              (() => {
                switch (validated.formData.policyType) {
                  case 'subscription':
                    return (
                      <>
                        <SubscriptionButton
                          amount={validated.amount}
                          token={new PublicKey(validated.tokenMint)}
                          recipient={new PublicKey(validated.recipient)}
                          gateway={new PublicKey(validated.gateway)}
                          maxRenewals={parseInt(validated.formData.maxRenewals) || 12}
                          interval={interval}
                          custom_interval={customInterval}
                          memo={validated.memo}
                          label={`➤ Subscribe for ${parseFloat(validated.formData.amount) || 10}/${
                            validated.formData.frequency
                          }`}
                          executeImmediately={true}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          radius="md"
                          size="md"
                        />
                        <SubscriptionButtonWithCode
                          amount={validated.amount}
                          token={new PublicKey(validated.tokenMint)}
                          gateway={new PublicKey(validated.gateway)}
                          maxRenewals={parseInt(validated.formData.maxRenewals) || 12}
                          interval={interval}
                          custom_interval={customInterval}
                          memo={validated.memo}
                          label={`ılıılııl ActionCode for ${parseFloat(validated.formData.amount) || 10}/${
                            validated.formData.frequency
                          }`}
                          executeImmediately={true}
                          radius="md"
                          size="md"
                        />
                      </>
                    )

                  case 'milestone': {
                    const milestoneAmounts = validated.formData.milestoneAmounts
                      .filter((_, i) => i < parseInt(validated.formData.totalMilestones))
                      .map(
                        (amount) =>
                          new BN(parseFloat(amount || '0') * Math.pow(10, getTokenPrecision(validated.tokenMint))),
                      )
                    const milestoneDates = validated.formData.milestoneDates
                      .filter((_, i) => i < parseInt(validated.formData.totalMilestones))
                      .map((date) => Math.floor(date.getTime() / 1000))
                    const milestoneTimestamps = milestoneDates.map((ts) => new BN(ts.toString()))

                    return (
                      <>
                        <MilestoneButton
                          milestoneAmounts={milestoneAmounts}
                          milestoneTimestamps={milestoneTimestamps}
                          releaseCondition={calculateReleaseCondition(validated.formData)}
                          token={new PublicKey(validated.tokenMint)}
                          recipient={new PublicKey(validated.recipient)}
                          gateway={new PublicKey(validated.gateway)}
                          memo={validated.memo}
                          label="➤ Create Milestone Payment"
                          executeImmediately={true}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          radius="md"
                          size="md"
                        />
                      </>
                    )
                  }

                  case 'payasyougo':
                    return (
                      <>
                        <PayAsYouGoButton
                          maxAmountPerPeriod={
                            new BN(
                              parseFloat(validated.formData.maxAmountPerPeriod || '0') *
                                Math.pow(10, getTokenPrecision(validated.tokenMint)),
                            )
                          }
                          maxChunkAmount={
                            new BN(
                              parseFloat(validated.formData.maxChunkAmount || '0') *
                                Math.pow(10, getTokenPrecision(validated.tokenMint)),
                            )
                          }
                          periodLengthSeconds={new BN(parseInt(validated.formData.periodLengthSeconds || '2592000'))}
                          token={new PublicKey(validated.tokenMint)}
                          recipient={new PublicKey(validated.recipient)}
                          gateway={new PublicKey(validated.gateway)}
                          memo={validated.memo}
                          label="➤ Create Pay-as-you-go"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          radius="md"
                          size="md"
                        />
                      </>
                    )

                  default:
                    return null
                }
              })()}
            {!connected &&
              (() => {
                switch (validated.formData.policyType) {
                  case 'subscription':
                    return (
                      <>
                        <WalletMultiButton />
                        <SubscriptionButtonWithCode
                          amount={validated.amount}
                          token={new PublicKey(validated.tokenMint)}
                          gateway={new PublicKey(validated.gateway)}
                          maxRenewals={parseInt(validated.formData.maxRenewals) || 12}
                          interval={interval}
                          custom_interval={customInterval}
                          memo={validated.memo}
                          label={`ılıılııl ActionCode for ${parseFloat(validated.formData.amount) || 10}/${
                            validated.formData.frequency
                          }`}
                          executeImmediately={true}
                          radius="md"
                          size="md"
                        />
                      </>
                    )

                  default:
                    return <WalletMultiButton />
                }
              })()}
          </div>
          <div>
            <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-t">
              <span className="text-xs font-semibold uppercase text-gray-600">React Code</span>
              <button
                onClick={() => copyCode(jsCode, 'js')}
                className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-200 transition-colors"
                style={{ borderColor: 'var(--color-primary)' }}
              >
                {copiedCode === 'js' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter
              language="typescript"
              style={ghcolors}
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.375rem 0.375rem',
                fontSize: '0.75rem',
                lineHeight: '1rem',
              }}
              codeTagProps={{
                style: {
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                },
              }}
            >
              {jsCode}
            </SyntaxHighlighter>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate a checkout link for your payment policy. Users will be redirected to a hosted checkout page.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--color-primary)] uppercase mb-1 block">
                Success URL (optional)
              </label>
              <input
                type="url"
                value={checkoutParams.successUrl}
                onChange={(e) => setCheckoutParams({ ...checkoutParams, successUrl: e.target.value })}
                placeholder="https://yourapp.com/success"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-primary)] uppercase mb-1 block">
                Cancel URL (optional)
              </label>
              <input
                type="url"
                value={checkoutParams.cancelUrl}
                onChange={(e) => setCheckoutParams({ ...checkoutParams, cancelUrl: e.target.value })}
                placeholder="https://yourapp.com/cancel"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-primary)] uppercase mb-1 block">
                Tracking ID (optional)
              </label>
              <input
                type="text"
                value={checkoutParams.trackingId}
                onChange={(e) => setCheckoutParams({ ...checkoutParams, trackingId: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-[var(--color-primary)] uppercase">
                  Line Items (optional)
                </label>
                <button
                  onClick={addLineItem}
                  className="text-xs px-2 py-1 bg-[var(--color-primary)] text-white rounded-md hover:opacity-90 transition-opacity"
                >
                  + Add Item
                </button>
              </div>

              {checkoutParams.lineItems.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Using base amount from policy settings. Add line items to override.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-3">Unit Price ($)</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-1" />
                  </div>
                  {checkoutParams.lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Product/Service name"
                        className={`col-span-6 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                          !item.description.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`col-span-3 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                          item.unitPrice <= 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="1"
                        className={`col-span-2 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                          item.quantity < 1 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      <button
                        onClick={() => removeLineItem(index)}
                        className="col-span-1 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {lineItemsActive && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-800">Computed Total:</span>
                <span className="text-xs font-bold text-blue-900">${computedAmount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Amount is calculated from line items above. Original amount field is disabled.
              </p>
            </div>
          )}

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold uppercase text-gray-600">Checkout URL</span>
              <button
                onClick={() => checkoutValidation.valid && copyCode(checkoutUrl, 'url')}
                disabled={!checkoutValidation.valid}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  checkoutValidation.valid
                    ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {copiedCode === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
            {!checkoutValidation.valid && checkoutValidation.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                <p className="text-xs text-red-700">{checkoutValidation.error}</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-3 border border-gray-200 break-all text-xs font-mono leading-relaxed">
              {checkoutValidation.valid ? checkoutUrl : 'Fix validation errors above to generate URL'}
            </div>
            <a
              href={checkoutValidation.valid ? checkoutUrl : '#'}
              target={checkoutValidation.valid ? '_blank' : undefined}
              rel={checkoutValidation.valid ? 'noopener noreferrer' : undefined}
              className={`inline-flex items-center gap-2 mt-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                checkoutValidation.valid
                  ? 'bg-[var(--color-primary)] text-white hover:opacity-90 hover:shadow-lg cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ↗ Open Checkout Page
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
