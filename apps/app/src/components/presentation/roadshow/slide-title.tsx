import { motion } from 'framer-motion'

export default function SlideTitle() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center px-8">
      <motion.div
        className="mb-6 flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="h-px w-12 bg-emerald-400" />
        <span className="text-emerald-400 text-xs uppercase tracking-[0.3em] font-semibold">Live on Mainnet</span>
        <div className="h-px w-12 bg-emerald-400" />
      </motion.div>

      <motion.h1
        className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-foreground mb-4"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        TRIBUTARY
      </motion.h1>

      <motion.p
        className="text-lg sm:text-xl text-muted-foreground tracking-wide mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        Payment Infrastructure for the Solana Economy
      </motion.p>

      <motion.div
        className="flex gap-4 mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
          Seed Round
        </span>
        <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-border text-muted-foreground">
          $176K
        </span>
      </motion.div>

      <motion.p
        className="text-sm text-muted-foreground italic max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.65 }}
      >
        Non-custodial recurring payments. Fully built. Deployed. Raising to scale.
      </motion.p>

      <motion.div
        className="absolute bottom-8 text-muted-foreground text-xs uppercase tracking-[0.2em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        Press &rarr; to continue
      </motion.div>
    </div>
  )
}
