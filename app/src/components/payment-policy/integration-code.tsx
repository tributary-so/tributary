import { useState } from 'react'
import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { Copy, Check } from '../../icons'
import { PaymentPolicyFormData } from './payment-policy-form'
import { getTokenPrecisionAtom } from '@/lib/token-store'
import { useAtomValue } from 'jotai'
import { BN } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

interface IntegrationCodeProps {
  formData: PaymentPolicyFormData
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
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
  const intervalSeconds = parseInt(formData.intervalSeconds) || 604800 // 1 week default

  return { tokenMint, recipient, gateway, amount, memo, frequency, intervalSeconds }
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
export default function IntegrationCode({ formData }: IntegrationCodeProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const getTokenPrecision = useAtomValue(getTokenPrecisionAtom)

  const validated = getValidatedFormData(formData, getTokenPrecision)
  const { interval, customInterval } = getPaymentInterval(validated.frequency, validated.intervalSeconds)

  const jsCode = `import { SubscriptionButton, PaymentInterval } from '@tributary-so/sdk-react'
import { PaymentFrequency } from '@tributary-so/sdk'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<SubscriptionButton
  amount={new BN(${validated.amount.toString()})}
  token={new PublicKey('${validated.tokenMint}')}
  recipient={new PublicKey('${validated.recipient}')}
  gateway={new PublicKey('${validated.gateway}')}
  maxRenewals={12}
  interval={PaymentInterval.${capitalizeFirst(formData.frequency)}}
  ${formData.frequency == 'custom' ? `custom_interval={${validated.intervalSeconds}}\r\n  ` : ''}memo="${
    validated.memo
  }"
  label="Subscribe for $${parseFloat(formData.amount) || 10}/${validated.frequency}"
  executeImmediately={true}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`
  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="max-w-[500px] space-y-4">
      <p className="text-sm text-gray-600">Copy/Paste the react code below to get your own custom button!</p>

      <SubscriptionButton
        amount={validated.amount}
        token={new PublicKey(validated.tokenMint)}
        recipient={new PublicKey(validated.recipient)}
        gateway={new PublicKey(validated.gateway)}
        maxRenewals={12}
        interval={interval}
        custom_interval={customInterval}
        memo={validated.memo}
        label={`Subscribe for ${parseFloat(formData.amount) || 10}/${validated.frequency}`}
        executeImmediately={true}
        className="bg-blue-600 hover:bg-blue-700 text-white"
        radius="md"
        size="md"
        // onSuccess={handleSuccess}
        // onError={handleError}
      />

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
        <pre className="p-3 bg-gray-50 border border-t-0 border-gray-200 rounded-b overflow-x-auto text-xs">
          {jsCode}
        </pre>
      </div>
    </div>
  )
}
