import { motion } from 'framer-motion'

const incentives = [
  { label: '$2 USDC Signup', desc: 'Airdropped on profile completion with linked GitHub + X' },
  {
    label: '3-Month Builder Boost',
    desc: 'Protocol fee waived + 5% match on all incoming donations (treasury-funded)',
  },
  { label: '300 Credits', desc: 'Redeemable for production payment gateway deployment on mainnet' },
  {
    label: 'Referral Priority',
    desc: '60/30/10 split on gateway fees — passive income from every supporter you onboard',
  },
]

export default function SlideTrack1() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Track 1 — Developer Onboarding
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        "Build & Earn"
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Target: Solana developers with program deployment history, Anchor interactions, devnet activity. ~100
        developers.
      </motion.p>

      <div className="flex gap-6 max-w-4xl w-full mb-6">
        <motion.div
          className="flex-1 border border-border bg-muted/30 p-4"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400 mb-1">Audience</div>
              <div className="text-xs text-muted-foreground">
                Solana devs with on-chain program deployments, Anchor interactions, wallets connected to dev tooling.
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400 mb-1">Action</div>
              <div className="text-xs text-foreground">
                Register on contribute.so. Connect GitHub + X. Create a developer profile.
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-400 mb-1">Value</div>
              <div className="text-xs text-muted-foreground">
                Turn open-source contributions into sustainable recurring revenue. contribute.so handles the
                infrastructure. You connect your GitHub. Supporters fund your work automatically.
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 mb-2">
            Incentive Stack
          </div>
          <div className="space-y-0">
            {incentives.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug">{item.desc}</div>
                </div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className="border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 max-w-3xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <p className="text-xs text-foreground">
          A developer receiving $30/mo in donations gets $31.50/mo with the Builder Boost. That is $4.50 extra over 3
          months. By month 3, receiving donations is a habit. The flywheel starts here.
        </p>
      </motion.div>
    </div>
  )
}
