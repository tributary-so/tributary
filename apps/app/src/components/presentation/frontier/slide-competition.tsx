import { motion } from 'framer-motion'

const segments = [
  { name: 'RPC subscriptions', color: 'bg-emerald-500' },
  { name: 'LLM / AI APIs', color: 'bg-emerald-400' },
  { name: 'DePIN networks', color: 'bg-teal-500' },
  { name: 'Agentic commerce', color: 'bg-cyan-500' },
  { name: 'SaaS / Fintech', color: 'bg-blue-500' },
  { name: 'Creator economy', color: 'bg-violet-500' },
  { name: 'Gaming platforms', color: 'bg-purple-500' },
  { name: 'NFT marketplaces', color: 'bg-fuchsia-500' },
]

export default function SlideCompetition() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-8 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Every recurring payment
        <br />
        <span className="text-emerald-400">on Solana.</span>
      </motion.h2>

      <div className="flex flex-col gap-2 max-w-md w-full">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.name}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
          >
            <div className={`w-3 h-3 ${seg.color} rounded-sm shrink-0`} />
            <span className="text-sm text-foreground">{seg.name}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6 text-center max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
      >
        Every Solana builder currently charging monthly USDC manually.
      </motion.p>
    </div>
  )
}
