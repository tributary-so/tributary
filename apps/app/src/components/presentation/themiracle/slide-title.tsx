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
        <div className="h-px w-12 bg-violet-400" />
        <span className="text-violet-400 text-xs uppercase tracking-[0.3em] font-semibold">
          Superteam Germany Builder's Track
        </span>
        <div className="h-px w-12 bg-violet-400" />
      </motion.div>

      <motion.h1
        className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground mb-2"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        TRIBUTARY
      </motion.h1>

      <motion.p
        className="text-lg sm:text-xl text-muted-foreground tracking-wide mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        x theMiracle
      </motion.p>

      <motion.p
        className="text-sm text-muted-foreground mb-8 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        Build the benefit. Win the placement. Fund the ecosystem.
      </motion.p>

      <motion.div
        className="flex gap-4 mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-violet-500/30 text-violet-400 bg-violet-500/5">
          $10K Placement
        </span>
        <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
          35M Wallets
        </span>
      </motion.div>

      <motion.p
        className="text-sm text-muted-foreground italic max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.65 }}
      >
        One campaign. Two sides of the marketplace. A self-reinforcing flywheel for open-source funding on Solana.
      </motion.p>
    </div>
  )
}
