import { motion } from 'framer-motion'

const metrics = [
  { value: '5+', label: 'Integrations', accent: false },
  { value: '4K+', label: 'Transfers executed', accent: false },
  { value: '15%', label: 'M.o.M growth', accent: false },
  { value: '$0', label: 'Marketing spent', accent: true },
  { value: '$0', label: 'Raised', accent: true },
]

const integrations = [
  { name: 'Allowly.app', desc: 'Pocket money for kids and AI agents', type: 'pay-as-you-go' },
  { name: 'Contribute.so', desc: 'Recurring donations platform', type: 'subscriptions' },
  { name: 'yumi.finance', desc: 'External payment flows', type: 'milestones' },
  { name: 'polycode.dev', desc: 'Integration in progress', type: 'in progress' },
]

export default function SlideTraction() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Built part-time.
        <br />
        <span className="text-emerald-400">Now full-time.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Smart contract live on mainnet. GTM launched
      </motion.p>

      <div className="flex gap-4 mb-10">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="flex flex-col items-center px-5 py-4 border border-border"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
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

      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Example Integrations
      </motion.p>
      <div className="flex gap-3 max-w-2xl w-full">
        {integrations.map((integration, i) => (
          <motion.div
            key={integration.name}
            className="relative flex-1 border border-border bg-muted p-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
          >
            <span className="text-[10px] absolute -top-0 right-0 px-1.5 py-0.5 border border-t-0 border-r-0 border-amber-800/30 bg-amber-700/20 text-amber-900/60">
              {integration.type}
            </span>
            <div className="text-xs font-semibold text-foreground mb-1.5">{integration.name}</div>
            <div className="text-[10px] text-muted-foreground leading-snug">{integration.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
