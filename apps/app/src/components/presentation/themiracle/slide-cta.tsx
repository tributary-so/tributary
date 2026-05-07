import { motion } from 'framer-motion'

const links = [
  { label: 'Product', value: 'contribute.so' },
  { label: 'Protocol', value: 'tributary.so' },
  { label: 'Docs', value: 'docs.tributary.so' },
  { label: 'SDK', value: 'npmjs.com/@tributary-so/sdk' },
  { label: 'GitHub', value: 'github.com/tributary-so' },
  { label: 'Program', value: 'TRibg8W8...42tJ' },
]

const contact = [
  { label: 'Email', value: 'fabian@tributary.so' },
  { label: 'Telegram', value: '@xeroc' },
  { label: 'Twitter', value: '@xer0c' },
]

export default function SlideCTA() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-violet-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Let's Build
      </motion.p>

      <motion.h2
        className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Build the benefit.
        <br />
        <span className="text-emerald-400">Win the placement.</span>
        <br />
        <span className="text-muted-foreground">Fund the ecosystem.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        The $10K placement catalyzes sustainable, recurring, on-chain funding for
        Solana's open-source developers. Every dollar compounds.
      </motion.p>

      <div className="flex gap-8 max-w-3xl w-full">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Links</div>
          <div className="space-y-0">
            {links.map((link, i) => (
              <motion.div
                key={link.label}
                className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{link.label}</span>
                <span className="text-xs font-mono text-foreground">{link.value}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Contact</div>
          <div className="space-y-0">
            {contact.map((c, i) => (
              <motion.div
                key={c.label}
                className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <span className="text-xs text-emerald-400 font-medium">{c.value}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-4 border border-emerald-500/20 bg-emerald-500/5 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <div className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-secondary)' }}>
              fabian@tributary.so
            </div>
            <div className="text-xs text-muted-foreground mt-1">Two tracks. One flywheel. Let's fund the ecosystem.</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
