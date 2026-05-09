import { motion } from 'framer-motion'

const stats = [
  { value: '$15T', label: 'Visa Volume 2025', highlight: false },
  { value: '$33T', label: 'Stablecoin Volume 2025', highlight: false },
  { value: '$56T', label: 'Projected by 2030', highlight: false },
  { value: '$0', label: 'Recurring Stablecoins', highlight: true },
]

export default function SlideMarket() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Opportunity
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Stablecoins overtook Visa.
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground max-w-lg text-center mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p>
          <span className="text-muted-foreground">Commerce hasn&apos;t followed.</span>
        </p>
      </motion.p>

      <div className="flex gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`flex flex-col items-center px-6 py-4 border ${stat.highlight ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-muted/30'
              }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <span
              className={`text-2xl sm:text-3xl font-bold ${stat.highlight ? 'text-orange-400' : 'text-foreground'}`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {stat.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
