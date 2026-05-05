import { motion } from 'framer-motion'

const scenarios = [
  { label: 'Conservative', merchants: '5', volume: '$50K/mo', revenue: '$500/mo' },
  { label: 'Moderate', merchants: '15', volume: '$500K/mo', revenue: '$5K/mo' },
  { label: 'Optimistic', merchants: '50', volume: '$2M/mo', revenue: '$20K/mo' },
]

const mechanics = [
  { title: 'Protocol Fee', desc: '1% on every payment, auto-deposited to treasury' },
  { title: 'Business Fee', desc: 'Gateway operator (configurable)' },
  { title: 'Zero Capital', desc: 'No custodial risk, 0$ TVL as a feature' },
  { title: 'Compounding', desc: 'Each merchant integration = recurring volume floor' },
]

export default function SlideRevenue() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Revenue Path
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        1% of every payment.
        <br />
        <span className="text-emerald-400">Compounding with every merchant.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Today: Pre-revenue. Protocol fees enabled, volume growing. 12 months post-audit:
      </motion.p>

      <div className="flex gap-4 mb-8 max-w-3xl w-full">
        {scenarios.map((s, i) => (
          <motion.div
            key={s.label}
            className={`flex-1 border p-4 ${
              i === 1 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-muted/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div
              className={`text-xs uppercase tracking-wider font-bold mb-3 ${
                i === 1 ? 'text-emerald-400' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-muted-foreground">Merchants</div>
                <div className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-secondary)' }}>
                  {s.merchants}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Volume</div>
                <div className="text-sm font-semibold text-foreground">{s.volume}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Protocol Revenue</div>
                <div
                  className={`text-lg font-bold ${i === 1 ? 'text-emerald-400' : 'text-foreground'}`}
                  style={{ fontFamily: 'var(--font-secondary)' }}
                >
                  {s.revenue}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-3xl w-full">
        {mechanics.map((m, i) => (
          <motion.div
            key={m.title}
            className="border border-border bg-muted/10 px-3 py-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1">{m.title}</div>
            <div className="text-[10px] text-muted-foreground">{m.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
      >
        The key variable isn&apos;t fee percentage; merchant count is. That&apos;s what the next 6 months of developer
        onboarding builds toward.
      </motion.p>
    </div>
  )
}
