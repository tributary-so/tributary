import { motion } from 'framer-motion'

const painPoints = [
  { icon: '01', title: 'Manual Approvals', desc: 'Crypto subscriptions require manual approval every billing cycle' },
  {
    icon: '02',
    title: 'Dev Complexity Wall',
    desc: 'Wallet integrations, RPC nodes, on-chain deserialization — weeks of plumbing',
  },
  {
    icon: '03',
    title: 'No Unified Protocol',
    desc: 'No single system handles subscriptions, milestones, usage billing, and invoices',
  },
  { icon: '04', title: 'Web2 Avoidance', desc: 'Businesses want USDC but refuse to learn blockchain infrastructure' },
]

export default function SlideProblem() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Problem
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Recurring payments on Solana
        <br />
        <span className="text-muted-foreground">are still not available.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-10 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Most businesses work around this limitation.
      </motion.p>

      <div className="grid grid-cols-2 gap-4 max-w-3xl w-full mb-8">
        {painPoints.map((point, i) => (
          <motion.div
            key={point.icon}
            className="border border-destructive/50 bg-destructive/10 p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-destructive/60" style={{ fontFamily: 'var(--font-secondary)' }}>
                {point.icon}
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-destructive/80">{point.title}</span>
            </div>
            <div className="text-xs text-muted-foreground leading-snug">{point.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        Every team that wants recurring revenue reinvents this alone. Until now.
      </motion.p>
    </div>
  )
}
