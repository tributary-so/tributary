import { motion } from 'framer-motion'

const metrics = [
  { value: '$0', label: 'Raised', accent: true },
  { value: '4', label: 'npm packages', accent: false },
  { value: '5+', label: 'Live integrations', accent: false },
  { value: '>95%', label: 'Test coverage', accent: false },
  { value: '$0', label: 'Marketing spend', accent: true },
  { value: '$0', label: 'Custody risk', accent: false },
]

const integrations = [
  { name: 'Allowly.app', desc: 'Pocket money for kids and AI agents', type: 'pay-as-you-go' },
  { name: 'Contribute.so', desc: 'Recurring donations platform', type: 'subscriptions' },
  { name: 'Cash.yumi.finance', desc: 'External payment flows', type: 'milestones' },
  { name: 'polycode.dev', desc: 'Integration in progress', type: 'in progress' },
]

export default function SlideTraction() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        What&apos;s Built
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Bootstrapped.
        <br />
        <span className="text-emerald-400">Fully deployed. $0 raised.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Smart contract live on mainnet. 4 npm packages. 4 applications deployed. Ottersec verified.
      </motion.p>

      <div className="grid grid-cols-3 gap-3 mb-8 max-w-3xl w-full">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className={`flex flex-col items-center px-4 py-3 border ${m.accent ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
              }`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
          >
            <span
              className={`text-2xl font-bold ${m.accent ? 'text-amber-400' : 'text-emerald-400'}`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {m.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{m.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-3xl w-full">
        {integrations.map((integration, i) => (
          <motion.div
            key={integration.name}
            className="relative border border-border bg-muted/30 p-3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
          >
            <span className="text-[9px] absolute -top-0 right-0 px-1.5 py-0.5 border border-t-0 border-r-0 border-amber-800/30 bg-amber-700/20 text-amber-900/60">
              {integration.type}
            </span>
            <div className="text-xs font-semibold text-foreground mb-1">{integration.name}</div>
            <div className="text-[10px] text-muted-foreground leading-snug">{integration.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1 }}
      >
        Organic demand from businesses — zero BD, zero outreach, zero partnerships. For infrastructure, that&apos;s the
        right leading indicator.
      </motion.p>
    </div>
  )
}
