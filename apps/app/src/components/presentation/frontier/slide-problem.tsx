import { motion } from 'framer-motion'

const options = [
  {
    label: 'One-time fee',
    verdict: 'No retention, no recurring revenue',
    bad: true,
  },
  {
    label: 'Setup fee',
    verdict: 'Same problem, users pay once and leave',
    bad: true,
  },
  {
    label: 'Integrate Stripe',
    verdict: 'Off-chain, no crypto composability',
    bad: true,
  },
]

export default function SlideProblem() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground/50 mb-4"
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
        yumi.finance needed
        <br />
        loan repayments on Solana
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Solana builders have three options for revenue. None are recurring.
      </motion.p>

      <div className="flex gap-4 mb-10 max-w-2xl w-full">
        {options.map((opt, i) => (
          <motion.div
            key={opt.label}
            className="flex-1 border border-destructive/20 bg-destructive/5 p-5 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div className="text-xs uppercase tracking-wider text-destructive/80 font-semibold mb-2">{opt.label}</div>
            <div className="text-xs text-muted-foreground">{opt.verdict}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-emerald-500/30 bg-emerald-500/5 px-8 py-5 max-w-lg text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p className="text-sm text-foreground mb-2">
          They found Tributary, evaluated the protocol, and{' '}
          <span className="text-emerald-400 font-semibold">integrated in 2 days</span> &mdash; with minimal
          documentation.
        </p>
        <p className="text-xs text-muted-foreground">Zero sales effort from our side.</p>
      </motion.div>

      <motion.p
        className="text-xs text-muted-foreground/40 italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
      >
        Every Solana team that wants recurring revenue reinvents this alone. Until now.
      </motion.p>
    </div>
  )
}
