import { motion } from 'framer-motion'

const bio = [
  'Dr.-Ing. Fabian Schuh — PhD Communications Engineer, 10+ years Web3',
  '>4 successful exits: Steemit (founding member), MakerDAO (advisor), Cryptonomex, Relay.md',
  '5+ operational Solana projects: Tributary, Allowly, Contribute.so, Chaoscraft, Polycode, repo.trade',
  'Rektoff Solana Security Cohort#2 Graduate, Superteam Germany Member',
  'Built the entire protocol solo with zero funding',
]

const team = [
  { role: 'Advisor', name: 'Stefan', extra: 'PhD Mathematics, Full Stack (10yrs)' },
  { role: 'Design', name: 'Ay', extra: 'Design (8yrs)' },
  { role: 'UX', name: 'Efe', extra: 'UX (15+ yrs), Superteam Poland' },
]

export default function SlideTeam() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Team
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Built solo.
        <br />
        <span className="text-emerald-400">Shipped $176K worth of product.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Not a first-time founder learning to ship. A veteran who shipped a complete protocol with $0.
      </motion.p>

      <motion.div
        className="max-w-xl w-full border border-border p-5 mb-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="space-y-2">
          {bio.map((line, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="shrink-0 w-1 h-1 bg-emerald-400 rounded-full mt-2" />
              <span className="text-foreground">{line}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-4 mb-6">
        {team.map((member, i) => (
          <motion.div
            key={member.role}
            className="border border-border bg-muted/10 px-5 py-2.5 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{member.role}</div>
            <div className="text-xs font-semibold text-foreground">{member.name}</div>
            <div className="text-[9px] text-muted-foreground">{member.extra}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
