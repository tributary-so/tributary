import { motion } from 'framer-motion'

const rows = [
  { component: 'Signup/activation bonus', track1: '$2 USDC', track2: 'Up to $5 match' },
  { component: 'Ongoing benefit', track1: '~$15 fee waiver + match (3mo)', track2: '~$2 fee waiver (3mo)' },
  { component: 'Credits (infrastructure)', track1: '300 credits (~$3)', track2: '100 credits (~$1)' },
  { component: 'Weekly rewards', track1: '\u2014', track2: '~$3 expected value' },
  { component: 'Per-user perceived value', track1: '~$20', track2: '~$10' },
  { component: 'Users targeted', track1: '~100 developers', track2: '~300 supporters' },
]

export default function SlideValueTable() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Value Summary
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Combined perceived value:
        <br />
        <span className="text-emerald-400">~$5,000</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Two tracks. One campaign. Meeting the $5K minimum with real, distributed value.
      </motion.p>

      <motion.div
        className="max-w-3xl w-full border border-border mb-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left uppercase tracking-wider font-semibold text-muted-foreground border-b border-r border-border bg-muted/30">
                Component
              </th>
              <th className="px-4 py-2 text-left uppercase tracking-wider font-semibold text-emerald-400 border-b border-r border-border bg-emerald-500/5">
                Track 1 (Developer)
              </th>
              <th className="px-4 py-2 text-left uppercase tracking-wider font-semibold text-blue-400 border-b border-border bg-blue-500/5">
                Track 2 (Supporter)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.component} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2 text-muted-foreground border-r border-border/50">{row.component}</td>
                <td className="px-4 py-2 text-foreground font-mono border-r border-border/50">{row.track1}</td>
                <td className="px-4 py-2 text-foreground font-mono">{row.track2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <div className="flex gap-4 max-w-3xl w-full">
        <motion.div
          className="flex-1 border border-emerald-500/20 bg-emerald-500/5 p-4 text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <span className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
            ~$2,000
          </span>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Track 1 total (100 devs)
          </div>
        </motion.div>
        <motion.div
          className="flex-1 border border-blue-500/20 bg-blue-500/5 p-4 text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <span className="text-2xl font-bold text-blue-400" style={{ fontFamily: 'var(--font-secondary)' }}>
            ~$3,000
          </span>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Track 2 total (300 supporters)
          </div>
        </motion.div>
      </div>
    </div>
  )
}
