import { motion } from 'framer-motion'

const stats = [
  { value: '35M', label: 'Monthly active wallets', accent: 'violet' },
  { value: '$15B+', label: 'TVL on Solana', accent: 'emerald' },
  { value: '$0', label: 'Sustainable dev funding', accent: 'amber' },
]

export default function SlideOpportunity() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Opportunity
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Millions of wallets.
        <br />
        <span className="text-muted-foreground">Zero sustainable dev funding.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Solana runs on open-source. Billions in TVL depend on programs developers ship for free. theMiracle reaches the
        right wallets. Tributary gives them something worth reaching for.
      </motion.p>

      <div className="flex gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`flex flex-col items-center px-6 py-4 border ${
              stat.accent === 'violet'
                ? 'border-violet-500/30 bg-violet-500/5'
                : stat.accent === 'amber'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-border bg-muted/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                stat.accent === 'violet'
                  ? 'text-violet-400'
                  : stat.accent === 'amber'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {stat.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-violet-500/30 bg-violet-500/5 px-6 py-4 max-w-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p className="text-sm text-foreground mb-1">
          <span className="font-bold">theMiracle</span> sits inside Solflare and MetaMask. Behavioral signals. On-chain
          data. Targeted delivery.
        </p>
        <p className="text-xs text-muted-foreground">
          That is a distribution channel for wallet-level conversion. We just need the right benefit.
        </p>
      </motion.div>
    </div>
  )
}
