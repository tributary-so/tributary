import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { CreateSubscriptionResult, PaymentInterval, SubscriptionButton } from '@tributary/sdk-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

const PAYMENT_GATEWAY_PUBLIC_KEY = new PublicKey('AWqqH2c5zKhBUKrme1D28uQooS54HvAeS1ix8nfQ4bEt')
const PAYMENT_RECIPIENT = new PublicKey('8EVBvLDVhJUw1nkAUp73mPyxviVFK9Wza5ba1GRANEw1')

export default function WidgetDemo() {
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSuccess = (result: CreateSubscriptionResult) => {
    setTxId(result.txId)
    setError(null)
    console.log('Subscription created successfully!', result)
  }

  const handleError = (err: Error) => {
    setError(err.message)
    setTxId(null)
    console.error('Subscription creation failed:', err)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-2">
      <div>
        <h1 className="text-3xl font-bold mb-2">Widget Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">Demonstration of the Tributary Subscription Button widget</p>
      </div>

      {txId && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="font-semibold">Subscription created successfully!</div>
            <div className="text-sm mt-1 font-mono break-all">Transaction: {txId}</div>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-6">
        <h3 className="text-lg font-semibold mb-3">Features</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>Single-click subscription creation with automatic wallet connection</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>Automatic user payment account creation if needed</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>Built-in loading states and error handling</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>Customizable styling with className prop</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>Success and error callbacks for custom handling</span>
          </li>
        </ul>
      </div>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Subscription Button Example</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This button demonstrates the simplified subscription creation API. Click to create a recurring payment
              subscription with a single function call.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4 flex justify-center items-center">
              <SubscriptionButton
                amount={new BN(10 * 1e6)}
                token={new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}
                recipient={PAYMENT_RECIPIENT}
                gateway={PAYMENT_GATEWAY_PUBLIC_KEY}
                interval={PaymentInterval.Monthly}
                maxRenewals={12}
                approvalAmount={new BN(10_000_000_000)}
                memo="Premium subscription - Widget Demo"
                label="Subscribe for $10/month"
                className="bg-linear-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
                radius="full"
                size="lg"
                executeImmediately={false}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Usage Example</h3>
            <div className="rounded-lg overflow-hidden">
              <SyntaxHighlighter
                language="tsx"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {`import { SubscriptionButton } from '@tributary/sdk-widgets'
import { PaymentInterval } from '@tributary/sdk-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

<SubscriptionButton
  amount={new BN(10_000_000)}
  token={new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')}
  recipient={PAYMENT_RECIPIENT}
  gateway={PAYMENT_GATEWAY_PUBLIC_KEY}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Premium subscription - Widget Demo"
  label="Subscribe for $10/month"
  executeImmediately={true}
  className="bg-blue-600 hover:bg-blue-700 text-white"
  onSuccess={handleSuccess}
  onError={handleError}
/>`}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
