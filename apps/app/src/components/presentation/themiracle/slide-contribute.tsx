import { motion } from 'framer-motion'

const features = [
  { label: 'GitHub Integration', desc: 'Developers link repos. Contribution history is public and verifiable.' },
  { label: 'X Integration', desc: 'Social identity. Not anonymous. Accounts you can trust.' },
  { label: 'One-Click Donations', desc: 'Recurring USDC via token delegation. Sign once, donate monthly.' },
  { label: 'Zero Custody', desc: 'Funds stay in supporter wallets until Tributary executes on schedule.' },
]

export default function SlideContribute() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Product
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        contribute.so
        <br />
        <span className="text-emerald-400">The product, not a side quest.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Not "try our SDK." Not a developer tool with a consumer veneer. A real product that solves a real problem:
        sustainable recurring funding for open-source developers on Solana.
      </motion.p>

      <div className="flex gap-6 max-w-4xl w-full mb-8">
        <motion.div
          className="flex-1 border border-emerald-500/20 bg-emerald-500/5 p-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400 mb-3">How it works</div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold text-xs shrink-0">1.</span>
              <span className="text-xs text-foreground">Developer creates profile, links GitHub + X</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold text-xs shrink-0">2.</span>
              <span className="text-xs text-foreground">Supporter discovers developer on contribute.so</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold text-xs shrink-0">3.</span>
              <span className="text-xs text-foreground">Sets up recurring USDC donation ($1/mo minimum)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold text-xs shrink-0">4.</span>
              <span className="text-xs text-foreground">Tributary executes payments automatically, on-chain</span>
            </div>
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="space-y-0">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">{f.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug">{f.desc}</div>
                </div>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        Users experience Tributary's core technology — recurring payments via token delegation — through a
        consumer-friendly interface. The wallet placement drives them directly into a working product.
      </motion.p>
    </div>
  )
}
