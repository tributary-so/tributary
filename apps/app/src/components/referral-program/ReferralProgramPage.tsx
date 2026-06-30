import { useState } from 'react'
import { Gift, Users, TrendingUp } from 'lucide-react'
import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useSDK } from '@/lib/client'
import type { PaymentGateway } from '@tributary-so/sdk'
import ReferralProgramExplainer from './ReferralProgramExplainer'
import ReferralAccountForm from './referral-account-form'

export default function ReferralProgramPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const sdk = useSDK(wallet, connection)
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null)

  const handleGatewayChange = async (gatewayPubkey: string) => {
    if (!sdk) return
    try {
      const gateway = await sdk.getPaymentGateway(new PublicKey(gatewayPubkey))
      setSelectedGateway(gateway)
    } catch (error) {
      console.error('Error fetching gateway details:', error)
      setSelectedGateway(null)
    }
  }

  return (
    <div className="min-h-screen bg-lando-bg py-12 px-4">
      <div className="space-y-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-lando-text mb-4">Referral Program</h1>
            <p className="text-xl text-lando-muted">Earn rewards by inviting others to Tributary ecosystem</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-lando-card  border border-lando-border">
              <div className="w-10 h-10 bg-lando-accent/20  flex items-center justify-center mb-4">
                <Gift className="w-5 h-5 text-lando-accent" />
              </div>
              <h3 className="text-lg font-semibold text-lando-text mb-2">Create Your Code</h3>
              <p className="text-sm text-lando-muted">
                Generate a unique 6-character referral code when you create your first payment policy
              </p>
            </div>

            <div className="p-6 bg-lando-card  border border-lando-border">
              <div className="w-10 h-10 bg-lando-accent/20  flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-lando-accent" />
              </div>
              <h3 className="text-lg font-semibold text-lando-text mb-2">Share & Invite</h3>
              <p className="text-sm text-lando-muted">
                Share your code with friends. When they subscribe using it, you're linked in their referral chain
              </p>
            </div>

            <div className="p-6 bg-lando-card  border border-lando-border">
              <div className="w-10 h-10 bg-lando-accent/20  flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-lando-accent" />
              </div>
              <h3 className="text-lg font-semibold text-lando-text mb-2">Earn on Payments</h3>
              <p className="text-sm text-lando-muted">
                Every time someone in your chain makes a payment, you earn rewards. 3 levels deep!
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ReferralAccountForm onGatewayChange={handleGatewayChange} />
        </div>
        <ReferralProgramExplainer gateway={selectedGateway} />
      </div>
    </div>
  )
}
