import { motion } from 'framer-motion'

const cols = ['', 'Tributary', 'Helio', 'Stripe']
const rows = [
  ['Model', 'Protocol (infra)', 'Payment product', 'Payment product'],
  ['Custody', 'Non-custodial', 'Non-custodial', 'Privacy (Token-2022)'],
  ['Payment Types', '4+', '1', '1'],
  ['Business Layer', 'Yes', 'No', 'No'],
  ['Self-hostable', 'Yes', 'No', 'No'],
  ['Mainnet', 'Live', 'Live', 'Not yet'],
]

const wallets = [
  {
    name: 'Squads',
    what: 'M-of-N multisig, $10B+ secured',
    gap: 'No subscriptions or scheduling',
    play: 'Squad vault + Tributary = DAO recurring payments',
  },
  {
    name: 'LazorKit',
    what: 'Passkey-native wallet, gasless',
    gap: 'Auth only, no payments',
    play: 'Passkey login + Tributary = zero-friction consumer subs',
  },
  {
    name: 'Swig',
    what: '65K-role policy engine',
    gap: 'Access control only',
    play: 'Swig roles + Tributary = scoped AI agent billing',
  },
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
        The moat is
        <span className="text-emerald-400"> technical.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Solana&apos;s token delegation means a user can only delegate to one protocol at a time. First-mover is
        technical lock-in.
      </motion.p>

      <motion.div
        className="max-w-3xl w-full overflow-x-auto mb-6"
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
                  className={`px-3 py-1.5 text-left uppercase tracking-wider font-semibold border-b border-border ${i === 0
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
                    className={`px-3 py-1.5 ${ci === 0
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

      <motion.div
        className="max-w-3xl w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
          Smart Wallets — Composable, Not Competitive
        </div>
        <div className="grid grid-cols-3 gap-3">
          {wallets.map((w) => (
            <div key={w.name} className="border border-border bg-muted/30 p-3">
              <div className="text-xs font-bold text-foreground mb-1">{w.name}</div>
              <div className="text-[10px] text-muted-foreground mb-1">{w.what}</div>
              <div className="text-[10px] text-emerald-400">{w.play}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
