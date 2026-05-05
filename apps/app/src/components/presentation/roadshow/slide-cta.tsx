import { motion } from 'framer-motion'
import QRCodeGenerator from '../../qrcode'

const links = [
  { label: 'Website', value: 'tributary.so' },
  { label: 'Docs', value: 'docs.tributary.so' },
  { label: 'SDK', value: 'sdk.tributary.so' },
  { label: 'GitHub', value: 'github.com/tributary-so' },
  { label: 'Program', value: 'TRibg8W8...42tJ' },
]

const contact = [
  { label: 'Email', value: 'fabian@chainsquad.com' },
  { label: 'Telegram', value: '@xeroc' },
  { label: 'Twitter', value: '@xer0c' },
]

export default function SlideCTA() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Let&apos;s Build
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        The protocol is built.
        <br />
        <span className="text-emerald-400">The checkout makes crypto invisible.</span>
        <br />
        <span className="text-muted-foreground">The moat is technical.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Now we onboard the world. Raising $176K to complete the security audit and scale developer adoption.
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
        </div>

        <div className="flex flex-col items-center justify-center">
          <QRCodeGenerator url="https://tributary.so" text="" size="90px" />
          <span className="text-[9px] text-muted-foreground mt-1">tributary.so</span>
        </div>
      </div>

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-secondary)' }}>
          fabian@chainsquad.com
        </div>
        <div className="text-xs text-muted-foreground mt-1">Let&apos;s talk.</div>
      </motion.div>
    </div>
  )
}
