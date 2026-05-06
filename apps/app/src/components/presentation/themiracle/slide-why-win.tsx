import { motion } from 'framer-motion'

const reasons = [
  {
    num: '01',
    title: 'Two-sided flywheel in one campaign',
    desc: 'Most benefits are one-shot. This creates a self-reinforcing ecosystem. Developers join because money is waiting. Supporters join because developers are there to fund.',
    accent: 'emerald',
  },
  {
    num: '02',
    title: 'contribute.so is the product',
    desc: "Not a demo. Not a SDK trial. A live product that solves a real problem. Users experience Tributary's core tech through a consumer-friendly interface.",
    accent: 'violet',
  },
  {
    num: '03',
    title: 'Conversion is fully measurable',
    desc: 'Profile creation, GitHub/X linking, first subscription, first donation. Every step trackable. Wallet-level analytics on every user who converted.',
    accent: 'amber',
  },
  {
    num: '04',
    title: 'Incentives compound, not expire',
    desc: 'The Builder Boost runs 6 months. Not a one-time hook. By month 6, receiving donations is a habit. The weekly SOL draw keeps supporters engaged for 8 weeks.',
    accent: 'blue',
  },
  {
    num: '05',
    title: 'It funds actual Solana development',
    desc: "Every dollar flowing through this campaign funds open-source work on Solana. The $10K placement doesn't disappear into wallets. It catalyzes ongoing, sustainable ecosystem funding.",
    accent: 'emerald',
  },
]

const accentMap: Record<string, { border: string; text: string; dot: string }> = {
  emerald: { border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  violet: { border: 'border-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
  amber: { border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  blue: { border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
}

export default function SlideWhyWin() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Why This Wins
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Five reasons.
        <br />
        <span className="text-muted-foreground">None of them are "because we said so."</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Judged on benefit design, conversion potential, incentive quality, product credibility, and community fit.
      </motion.p>

      <div className="max-w-3xl w-full space-y-3 grid grid-cols-2">
        {reasons.map((reason, i) => {
          const a = accentMap[reason.accent]
          return (
            <motion.div
              key={reason.num}
              className={`border ${a.border} p-2 flex items-start gap-1`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            >
              <span className={`text-lg p-2 font-bold ${a.text} shrink-0`} style={{ fontFamily: 'var(--font-secondary)' }}>
                {reason.num}
              </span>
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  {reason.title}
                </div>
                <div className="text-[10px] text-muted-foreground leading-snug">{reason.desc}</div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
