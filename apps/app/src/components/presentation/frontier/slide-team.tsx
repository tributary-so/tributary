import { motion } from 'framer-motion'

const bio = [
  'Dr.-Ing. Fabian Schuh — PhD Communications Engineer, 10+ years Web3',
  '5+ Solana projects: Tributary, Allowly, Contribute.so, repo.trade, Perps',
  'Rektoff Solana Security Cohort Graduate. Superteam Germany.',
  'Produced >500M blocks across 16+ different L1s',
]

const team = [
  { role: 'Advisor', name: 'Stefan', extra: 'PhD Mathematics, Full Stack (10yrs)' },
  { role: 'Design', name: 'Ay', extra: '8 years in web3' },
  { role: 'UX', name: 'Efe', extra: '15+ years, Superteam Poland' },
]

export default function SlideTeam() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-3 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Built solo.
        <br />
        <span className="text-emerald-400">Scaling up.</span>
      </motion.h2>

      <motion.div
        className="max-w-lg w-full border border-border p-5 mb-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="space-y-2">
          {bio.map((line, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <div className="shrink-0 w-1 h-1 bg-emerald-400 rounded-full mt-1.5" />
              <span className="text-foreground">{line}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Assisted by
      </motion.p>
      <div className="flex gap-3">
        {team.map((member, i) => (
          <motion.div
            key={member.name}
            className="border border-border bg-muted/10 px-5 py-2.5 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{member.role}</div>
            <div className="text-xs font-semibold text-foreground">{member.name}</div>
            <div className="text-[9px] text-muted-foreground">{member.extra}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
