import { motion } from 'framer-motion'

const reasons = [
  { icon: '$', title: 'Micro-billing', desc: 'Subscriptions at $0.99 — transaction cost makes it possible' },
  { icon: '<1s', title: 'Sub-second finality', desc: 'Instant payment confirmation' },
  { icon: '{ }', title: 'Developer experience', desc: 'Best DX in crypto expands the market' },
]

export default function SlideInfrastructure() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Only Solana
        <br />
        <span className="text-emerald-400">makes this work.</span>
      </motion.h2>

      <motion.div
        className="mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <img src="/solana-logomark.svg" alt="Solana" className="w-16 h-16 mx-auto" />
      </motion.div>

      <div className="flex gap-4 max-w-2xl w-full">
        {reasons.map((r, i) => (
          <motion.div
            key={r.title}
            className="flex-1 border border-border bg-muted/10 p-5 text-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
          >
            <div className="text-2xl font-bold text-emerald-400 mb-2" style={{ fontFamily: 'var(--font-secondary)' }}>
              {r.icon}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-foreground mb-1">{r.title}</div>
            <div className="text-[10px] text-muted-foreground leading-snug">{r.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
