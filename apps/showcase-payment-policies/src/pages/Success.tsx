import { Link } from 'react-router'
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useTributaryToken } from '@tributary-so/sdk-react'
import { API_BASE_URL } from '@/constants'
// ponytail: third copy of PaymentDetails → extract on next reuse.
// For now mirror showcase-payments + apps/checkout.
import { PaymentDetails } from '@/components/payment-details'

export default function Success() {
  const { token, payload, loading } = useTributaryToken(undefined, API_BASE_URL)

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-muted-foreground text-sm">Verifying token...</p>
      </main>
    )
  }

  if (!token || !payload) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Token</h1>
        <p className="text-muted-foreground text-sm mb-6">No valid payment token was found in the URL.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-20">
      <div className="text-center mb-10">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Policy Created</h1>
        <p className="text-muted-foreground text-sm">Your payment policy is active on Solana.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <PaymentDetails payload={payload} />

        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Create Another Policy
          </Link>
        </div>
      </div>
    </main>
  )
}
