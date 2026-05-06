import { motion } from 'framer-motion'

const todayItems = [
  'Protocol live on Solana mainnet',
  'Full SDK, React components, 3 payment types',
  'contribute.so in early launch',
  'Discord + GitHub integrations shipping',
  'Built in 3 weeks for Colosseum Hackathon',
]

const successItems = [
  '150 developer signups (Track 1)',
  '500 active supporters (Track 2)',
  '30-day campaign window',
  '30% post-incentive retention target',
  '$750-1,500/mo sustainable funding',
]

const followOnItems = [
  'Referral program: 60/30/10 gateway fee split',
  'Every Track 1 dev becomes acquisition channel for Track 2',
  'Follow-on theMiracle activations at preferential rates',
  'Strong first campaign = compounding growth',
]

export default function SlideGrowth() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Growth Context
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Where we are.
        <br />
        <span className="text-emerald-400">Where we are going.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Three weeks from zero to mainnet. Now we need distribution. That is what theMiracle provides.
      </motion.p>

      <div className="flex gap-4 max-w-4xl w-full mb-6">
        <motion.div
          className="flex-1 border border-border bg-muted/30 p-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Today</div>
          <div className="space-y-2">
            {todayItems.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-muted-foreground/40 rounded-full mt-1.5 shrink-0" />
                <span className="text-[10px] text-muted-foreground leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex-1 border border-emerald-500/20 bg-emerald-500/5 p-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 mb-3">
            Success Criteria (30 days)
          </div>
          <div className="space-y-2">
            {successItems.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                <span className="text-[10px] text-foreground leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex-1 border border-violet-500/20 bg-violet-500/5 p-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-400 mb-3">Follow-on</div>
          <div className="space-y-2">
            {followOnItems.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <div className="w-1 h-1 bg-violet-400 rounded-full mt-1.5 shrink-0" />
                <span className="text-[10px] text-muted-foreground leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        Strong first-campaign results unlock the referral program as the next growth lever. The flywheel accelerates
        itself.
      </motion.p>
    </div>
  )
}
