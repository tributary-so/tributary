import { motion } from 'framer-motion'

const rows = [
  { type: 'Solana RPC provider', volume: '$5M', customers: '20', revenue: '$100K', color: 'bg-emerald-500' },
  { type: 'LLM provider', volume: '$10M', customers: '50', revenue: '$500K', color: 'bg-emerald-400' },
  { type: 'DePIN network', volume: '$8M', customers: '30', revenue: '$240K', color: 'bg-teal-500' },
  { type: 'Agentic commerce', volume: '$50M', customers: '10', revenue: '$500K', color: 'bg-cyan-500' },
  { type: 'Gaming platforms', volume: '$30M', customers: '10', revenue: '$300K', color: 'bg-blue-500' },
  { type: 'SaaS', volume: '$60M', customers: '25', revenue: '$300K', color: 'bg-violet-500' },
]

export default function SlideCTA() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Opportunity
      </motion.p>
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        1% of every transaction.
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Protocol fee alone. Businesses add ~2% and still undercut Web2.
      </motion.p>

      <motion.div
        className="max-w-2xl w-full overflow-x-auto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left uppercase tracking-wider text-muted-foreground font-semibold">Type</th>
              <th className="px-3 py-2 text-right uppercase tracking-wider text-muted-foreground font-semibold">
                Avg Volume
              </th>
              <th className="px-3 py-2 text-right uppercase tracking-wider text-muted-foreground font-semibold">#</th>
              <th className="px-3 py-2 text-right uppercase tracking-wider text-emerald-400 font-semibold">
                Protocol Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={row.type}
                className="border-b border-border/30"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.4 + i * 0.04 }}
              >
                <td className="px-3 py-1.5 text-foreground flex items-center gap-3">
                  <div className={`w-3 h-3 ${row.color} rounded-sm shrink-0`} />
                  <span className="text-sm text-foreground">{row.type}</span>
                </td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{row.volume}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{row.customers}</td>
                <td className="px-3 py-1.5 text-right text-emerald-400 font-semibold">{row.revenue}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-secondary)' }}>
          $2.34M<span className="text-sm text-muted-foreground">/month</span>
        </span>
        <span className="mx-2 text-muted-foreground">→</span>
        <span className="text-xl font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
          $28M ARR
        </span>
      </motion.div>
    </div>
  )
}
