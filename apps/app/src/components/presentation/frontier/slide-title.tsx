import { motion } from 'framer-motion'

export default function SlideTitle() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center px-8">
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
        Recurring payment rails for Solana.
      </motion.p>

      <motion.div
        className="flex gap-4 mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
          Frontier Hackathon
        </span>
        {/*
        <div className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-border text-muted-foreground flex gap-2">
          <span>
            <img src="/frontier/superteam.png" className="w-4 h-4 rounded" />
          </span>
          <span>Berlin Demo Day</span>
        </div>
      */}
      </motion.div>
    </div>
  )
}
