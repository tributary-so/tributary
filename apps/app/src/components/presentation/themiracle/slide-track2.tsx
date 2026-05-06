import { motion } from 'framer-motion'

const incentives = [
  {
    label: '2x First Month Match',
    desc: 'Donate $5, developer gets $10. Tributary treasury covers the match (up to $5 per user).',
  },
  { label: 'Weekly SOL Rewards', desc: '1 SOL drawn weekly for 6 weeks among active subscribers (~$900 total pool)' },
  { label: '3-Month Fee Waiver', desc: 'Zero protocol fees on your first Tributary subscription' },
  {
    label: 'Tributary Credits',
    desc: '100 credits per active subscription, redeemable for fee waivers on future payments',
  },
]

export default function SlideTrack2() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-blue-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Track 2 — Community Donor Activation
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        "Support & Earn"
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Target: Solflare users with active USDC/SOL balances, on-chain transaction history. ~300 supporters. Broad first
        wave, refined by theMiracle's behavioral signals.
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
                Solflare users with USDC/SOL balances, existing transaction history, wallets that interacted with social
                or creator tools.
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-400 mb-1">Action</div>
              <div className="text-xs text-foreground">
                Visit contribute.so via wallet benefit link. Discover Solana developers. Set up a recurring monthly
                donation ($1/mo minimum).
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-400 mb-1">Value</div>
              <div className="text-xs text-muted-foreground">
                Fund the developers building the Solana ecosystem you depend on. Your first month is doubled. Your fees
                are waived. And you are entered into weekly rewards for supporting builders.
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-blue-400 mb-2">Incentive Stack</div>
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
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className="border border-blue-500/30 bg-blue-500/5 px-5 py-3 max-w-3xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <p className="text-xs text-foreground">
          The 2x first-month match makes the first click easy. The weekly SOL draw keeps them engaged for 6 weeks. By
          then, supporting developers is a habit.
        </p>
      </motion.div>
    </div>
  )
}
