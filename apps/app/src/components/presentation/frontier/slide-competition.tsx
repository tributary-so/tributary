import { motion } from 'framer-motion'

const cols = ['', 'Tributary', 'Helio', 'VelaPay']
const rows = [
  ['Model', 'Protocol (infra)', 'Payment product', 'Payment product'],
  ['Custody', 'Non-custodial', 'Non-custodial', 'Privacy (Token-2022)'],
  ['Payment Types', '4+', '1', '1'],
  ['Business Layer', 'Yes', 'No', 'No'],
  ['Self-hostable', 'Yes', 'No', 'No'],
  ['Mainnet', 'Live', 'Live', 'Not yet'],
]

export default function SlideCompetition() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Competitive Landscape
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Others exist.
        <br />
        <span className="text-emerald-400">None let you build your own.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Two approaches to recurring payments on Solana. Ours lets anyone build a payment business.
      </motion.p>

      <motion.div
        className="max-w-3xl w-full overflow-x-auto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th
                  key={col}
                  className={`px-3 py-2 text-left uppercase tracking-wider font-semibold border-b border-border ${
                    i === 0
                      ? 'text-muted-foreground'
                      : i === 1
                      ? 'text-emerald-400 bg-emerald-500/5'
                      : 'text-muted-foreground bg-muted/20'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2 ${
                      ci === 0
                        ? 'font-semibold text-foreground'
                        : ci === 1
                        ? 'text-emerald-400 bg-emerald-500/5 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        Helio and VelaPay are payment products. <br />
        Tributary is the platform that lets anyone build one — and earn from it.
      </motion.p>
    </div>
  )
}
