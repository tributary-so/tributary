import { motion } from 'framer-motion'

const funds = [
  { category: 'Security Audit', amount: '<$50K', pct: '28%', highlight: true },
  { category: 'Founder Salary (6mo)', amount: '$48K', pct: '27%', highlight: false },
  { category: 'Marketing & Dev Growth', amount: '$48K', pct: '27%', highlight: false },
  { category: 'Operations (infra, legal)', amount: '$6K', pct: '3%', highlight: false },
  { category: 'Liquidity Pool', amount: '~$30K', pct: '17%', highlight: false },
]

export default function SlideFunds() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Use of Funds
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        $176K.
        <br />
        <span className="text-emerald-400">6 months runway.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Focused on product completion and developer adoption.
      </motion.p>

      <div className="max-w-2xl w-full space-y-0 mb-8">
        <motion.div
          className="grid grid-cols-3 border-b border-border pb-1 mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Category</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-right">
            Amount
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-right">
            Share
          </div>
        </motion.div>
        {funds.map((fund, i) => (
          <motion.div
            key={fund.category}
            className={`grid grid-cols-3 py-2.5 border-b border-border/30 last:border-0 ${
              fund.highlight ? 'bg-emerald-500/5 -mx-2 px-2 border-l-2 border-l-emerald-400' : ''
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
          >
            <div className="text-xs text-foreground font-medium">{fund.category}</div>
            <div className={`text-xs text-right font-mono ${fund.highlight ? 'text-emerald-400' : 'text-foreground'}`}>
              {fund.amount}
            </div>
            <div className="text-xs text-right text-muted-foreground">{fund.pct}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex items-center justify-between max-w-2xl w-full border-t border-border pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <div className="text-xs text-muted-foreground">
          Total:{' '}
          <span className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
            $176,000
          </span>
        </div>
        <div className="flex gap-4">
          <div className="border border-border bg-muted/10 px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Burn</div>
            <div className="text-xs font-bold text-foreground">~$16K/mo</div>
          </div>
          <div className="border border-border bg-muted/10 px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Runway</div>
            <div className="text-xs font-bold text-foreground">6 months</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
