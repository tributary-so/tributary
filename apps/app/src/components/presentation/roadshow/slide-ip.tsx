import { motion } from 'framer-motion'

const ip = [
  { category: 'Protocol Fee', detail: '1% Protocol fee goes into treasury, 100%' },
  { category: 'Code', detail: 'GitHub org + all repos, SDKs, smart contracts' },
  { category: 'Domains', detail: '*.tributary.so — full ownership transfer' },
  { category: 'On-chain', detail: 'Program upgrade authority → DAO multisig' },
  { category: 'Infrastructure', detail: 'Cloud, CI/CD, API keys, deployment configs' },
  //{ category: 'Brand', detail: 'X/Twitter, social accounts, partnerships' },
]

export default function SlideIP() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        IP & Legal
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Full IP transfer.
        <br />
        <span className="text-emerald-400">Clear, enforceable rights.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        All intellectual property transferred to the DAO&apos;s Cayman SPC entity. Real, enforceable value.
      </motion.p>

      <div className="grid grid-cols-5 gap-3 max-w-3xl w-full mb-8">
        {ip.map((item, i) => (
          <motion.div
            key={item.category}
            className="border border-border bg-muted/10 p-4 text-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
          >
            <div className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-2">{item.category}</div>
            <div className="text-[10px] text-muted-foreground leading-snug">{item.detail}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-border bg-muted/20 px-6 py-4 max-w-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p className="text-xs text-foreground">
          The Cayman SPC entity holds the project&apos;s IP on behalf of the DAO — it holds real, enforceable value.
          Being thorough here ensures clear rights to everything built and everything that will be built.
        </p>
      </motion.div>
    </div>
  )
}
