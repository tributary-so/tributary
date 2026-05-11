import { motion } from 'framer-motion'

const allocation = [
  { label: 'Engineering', value: '3 engineers', pct: 60 },
  { label: 'Audit', value: 'Security budget', pct: 20 },
  { label: 'Operations', value: 'Infra & growth', pct: 20 },
]

const milestones = [
  { label: 'Runway', value: '18 months' },
  { label: 'Target', value: '$20K MRR' },
  { label: 'Stage', value: 'Pre-seed' },
]

export default function SlideAsk() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Ask
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-emerald-400">$500K</span> pre-seed.
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-10 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        3 engineers + audit budget. 18 months runway to $20K MRR.
      </motion.p>

      <div className="flex gap-6 mb-10">
        {milestones.map((m, i) => (
          <motion.div
            key={m.label}
            className="flex flex-col items-center px-6 py-4 border border-border"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <span className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
              {m.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{m.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="max-w-lg w-full space-y-0 mb-8">
        {allocation.map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-24">{item.label}</span>
            <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.6, delay: 0.7 + i * 0.1 }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-20 text-right">{item.value}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex items-center gap-2 text-xs text-muted-foreground italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1 }}
      >
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        Protocol live &middot; Revenue day one &middot; Open source
      </motion.div>
    </div>
  )
}
