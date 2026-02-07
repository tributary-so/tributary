export default function ReferralProgramExplainer() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-lando-text mb-4">
          Referral Program
        </h1>
        <p className="text-xl text-lando-muted">
          Earn rewards by inviting others to Tributary ecosystem
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-lando-card rounded-xl border border-lando-border">
          <div className="w-10 h-10 bg-lando-accent/20 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🎁</span>
          </div>
          <h3 className="text-lg font-semibold text-lando-text mb-2">
            Create Your Code
          </h3>
          <p className="text-sm text-lando-muted">
            Generate a unique 6-character referral code when you create your
            first subscription
          </p>
        </div>

        <div className="p-6 bg-lando-card rounded-xl border border-lando-border">
          <div className="w-10 h-10 bg-lando-accent/20 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-lg font-semibold text-lando-text mb-2">
            Share & Invite
          </h3>
          <p className="text-sm text-lando-muted">
            Share your code with friends. When they subscribe using it, you're
            linked in their referral chain
          </p>
        </div>

        <div className="p-6 bg-lando-card rounded-xl border border-lando-border">
          <div className="w-10 h-10 bg-lando-accent/20 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">📈</span>
          </div>
          <h3 className="text-lg font-semibold text-lando-text mb-2">
            Earn on Payments
          </h3>
          <p className="text-sm text-lando-muted">
            Every time someone in your chain makes a payment, you earn rewards.
            3 levels deep!
          </p>
        </div>
      </div>

      <div className="bg-lando-card rounded-xl border border-lando-border p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">⚡</span>
          <h2 className="text-2xl font-bold text-lando-text">How It Works</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              1
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">
                Gateway-Specific Ecosystems
              </h4>
              <p className="text-sm text-lando-muted">
                Each gateway runs its own referral program. Your codes work
                per-gateway, not globally.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              2
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">
                Tiered Rewards (3 Levels)
              </h4>
              <p className="text-sm text-lando-muted">
                Earn up to 3 levels deep:{" "}
                <span className="font-semibold text-green-600">
                  60% / 30% / 10%
                </span>{" "}
                of referral pool
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              3
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">
                Gateway-Funded Rewards
              </h4>
              <p className="text-sm text-lando-muted">
                Rewards come from gateway fees (2.5% of payments). Gateway
                operators control their referral budget.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lando-accent text-lando-bg font-bold flex items-center justify-center text-sm">
              4
            </div>
            <div>
              <h4 className="font-semibold text-lando-text mb-1">
                On-Chain Transparency
              </h4>
              <p className="text-sm text-lando-muted">
                Every reward distribution is recorded on-chain. Full
                auditability, no hidden math.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-lando-card rounded-xl border border-lando-border p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎯</span>
          <h2 className="text-2xl font-bold text-lando-text">
            Reward Breakdown
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-lando-text mb-4">
              For a $100 Payment
            </h4>
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
                <span className="text-lando-muted">Gateway Fee (2.5%)</span>
                <span className="font-bold text-lando-text">$2.50</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border bg-green-50 px-2 rounded">
                <span className="text-green-700 font-medium">
                  Referral Pool (50%)
                </span>
                <span className="font-bold text-green-700">$1.25</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lando-border bg-blue-50 px-2 rounded">
                <span className="text-blue-700 font-medium">
                  Gateway Business Fee (50%)
                </span>
                <span className="font-bold text-blue-700">$1.25</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-lando-muted">Recipient Receives</span>
                <span className="font-bold text-lando-text">$96.50</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lando-text mb-4">
              Referral Pool Distribution
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-green-700 font-semibold">
                    Level 1 (Original Referrer)
                  </span>
                  <span className="text-2xl font-bold text-green-700">
                    $0.75
                  </span>
                </div>
                <div className="text-sm text-green-600">
                  60% of pool • highest earner
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-700 font-semibold">
                    Level 2 (Middle Referrer)
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    $0.38
                  </span>
                </div>
                <div className="text-sm text-blue-600">
                  30% of pool • second highest
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-purple-700 font-semibold">
                    Level 3 (Immediate Referrer)
                  </span>
                  <span className="text-2xl font-bold text-purple-700">
                    $0.12
                  </span>
                </div>
                <div className="text-sm text-purple-600">
                  10% of pool • latest in chain
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-lando-muted mt-6 text-center">
          Gateway operators can customize referral allocation (0-100% of gateway
          fee) and tier splits to fit their business model.
        </p>
      </div>

      <div className="bg-gradient-to-r from-lando-accent/10 to-lando-accent/5 rounded-xl border border-lando-accent/30 p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📈</span>
          <h2 className="text-2xl font-bold text-lando-text">
            Ready to Start Earning?
          </h2>
        </div>
        <p className="text-lando-muted mb-4">
          Create your referral account below to get your unique referral code.
          Share it, build your chain, and earn passive rewards on every payment.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-lando-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>Gateway-specific codes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Up to 3 earning levels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>On-chain transparent rewards</span>
          </div>
        </div>
      </div>
    </div>
  );
}
