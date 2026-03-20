import { TrendingUp, Zap, Target } from 'lucide-react'
import type { PaymentGateway } from '@tributary-so/sdk'

interface ReferralProgramExplainerProps {
  gateway: PaymentGateway | null
}

const PAYMENT_AMOUNT = 100

function bpsToPercent(bps: number): number {
  return bps / 100
}

export default function ReferralProgramExplainer({ gateway }: ReferralProgramExplainerProps) {
  const gatewayFeePercent = gateway ? bpsToPercent(gateway.gatewayFeeBps) : 2.5
  const referralAllocationPercent = gateway ? bpsToPercent(gateway.referralAllocationBps) : 50
  const tiers = gateway ? gateway.referralTiersBps : [6000, 3000, 1000]

  const protocolFee = 1
  const gatewayFee = PAYMENT_AMOUNT * (gatewayFeePercent / 100)
  const referralPool = gatewayFee * (referralAllocationPercent / 100)
  const gatewayBusinessFee = gatewayFee - referralPool

  const tier1Amount = referralPool * (tiers[0] / 10000)
  const tier2Amount = referralPool * (tiers[1] / 10000)
  const tier3Amount = referralPool * (tiers[2] / 10000)
  const recipientReceives = PAYMENT_AMOUNT - protocolFee - gatewayFee
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-linear-to-r from-lando-accent/10 to-lando-accent/5  border border-lando-accent/30 p-8 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-lando-accent" />
          <h2 className="text-2xl font-bold text-lando-text">Ready to Start Earning?</h2>
        </div>
        <p className="text-lando-muted mb-4">
          Create your referral account below to get your unique referral code. Share it, build your chain, and earn
          passive rewards on every payment.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-lando-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2  bg-status-active-500"></span>
            <span>Gateway-specific codes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2  bg-subscription-500"></span>
            <span>Up to 3 earning levels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2  bg-purple-500"></span>
            <span>On-chain transparent rewards</span>
          </div>
        </div>
      </div>

      <div className="bg-lando-card  border border-lando-border p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-lando-accent" />
          <h2 className="text-2xl font-bold text-lando-text">How It Works</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8  bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              1
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">Gateway-Specific Ecosystems</h4>
              <p className="text-sm text-lando-muted">
                Each gateway runs its own referral program. Your codes work per-gateway, not globally.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8  bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              2
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">Tiered Rewards (3 Levels)</h4>
              <p className="text-sm text-lando-muted">
                Earn up to 3 levels deep:{' '}
                <span className="font-semibold text-subscription-600">
                  {bpsToPercent(tiers[0])}% / {bpsToPercent(tiers[1])}% / {bpsToPercent(tiers[2])}%
                </span>{' '}
                of referral pool
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8  bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              3
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">Gateway-Funded Rewards</h4>
              <p className="text-sm text-lando-muted">
                Rewards come from gateway fees ({gatewayFeePercent}% of payments). Gateway operators control their
                referral budget.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8  bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              4
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">On-Chain Transparency</h4>
              <p className="text-sm text-lando-muted">
                Every reward distribution is recorded on-chain. Full auditability, no hidden math.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-lando-card  border border-lando-border p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-lando-accent" />
          <h2 className="text-2xl font-bold text-lando-text">Reward Breakdown</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-lando-text mb-4">For a $100 Payment</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-lando-border">
                <span className="text-lando-muted">Payment Amount</span>
                <span className="font-bold text-lando-text">$100.00</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border">
                <span className="text-lando-muted">Protocol Fee (1%)</span>
                <span className="font-bold text-lando-text">$1.00</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border">
                <span className="text-lando-muted">Gateway Fee ({gatewayFeePercent}%)</span>
                <span className="font-bold text-lando-text">${gatewayFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border bg-subscription-50 px-2 ">
                <span className="text-subscription-700 font-medium">Referral Pool ({referralAllocationPercent}%)</span>
                <span className="font-bold text-subscription-700">${referralPool.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border bg-secondary-50 px-2 ">
                <span className="text-secondary-700 font-medium">
                  Gateway Business Fee ({100 - referralAllocationPercent}%)
                </span>
                <span className="font-bold text-secondary-700">${gatewayBusinessFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border bg-blue-50 px-2 ">
                <span className="text-blue-700 font-medium">
                  Gateway Business Fee ({100 - referralAllocationPercent}%)
                </span>
                <span className="font-bold text-blue-700">${gatewayBusinessFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-lando-muted">Recipient Receives</span>
                <span className="font-bold text-lando-text">${recipientReceives.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lando-text mb-4">Referral Pool Distribution</h4>
            <div className="space-y-3">
              <div className="p-4 bg-subscription-50 ">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-subscription-700 font-semibold">Level 1 (Original Referrer)</span>
                  <span className="text-2xl font-bold text-subscription-700">${tier1Amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-subscription-600">{bpsToPercent(tiers[0])}% of pool • highest earner</div>
              </div>
              <div className="p-4 bg-milestone-50 ">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-milestone-700 font-semibold">Level 2 (Middle Referrer)</span>
                  <span className="text-2xl font-bold text-milestone-700">${tier2Amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-milestone-600">{bpsToPercent(tiers[1])}% of pool • second highest</div>
              </div>
              <div className="p-4 bg-payasyougo-50 ">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-payasyougo-700 font-semibold">Level 3 (Immediate Referrer)</span>
                  <span className="text-2xl font-bold text-payasyougo-700">${tier3Amount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-payasyougo-600">{bpsToPercent(tiers[2])}% of pool • latest in chain</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-lando-muted mt-6 text-center">
          Gateway operators can customize referral allocation (0-100% of gateway fee) and tier splits to fit their
          business model.
        </p>
      </div>
    </div>
  )
}
