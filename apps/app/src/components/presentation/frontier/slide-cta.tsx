import { motion } from 'framer-motion'
import QRCodeGenerator from '../../qrcode'

const resources = [
  { label: 'Hosted Checkout', value: 'checkout.tributary.so', tag: 'No code' },
  { label: 'React SDK', value: '@tributary-so/sdk-react', tag: 'npm' },
  { label: 'x402 Middleware', value: '@tributary-so/sdk-x402', tag: 'npm' },
  { label: 'Docs', value: 'docs.tributary.so', tag: 'Read' },
  { label: 'GitHub', value: 'github.com/tributary-so', tag: 'OSS' },
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
        Get Started
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
        <span className="text-emerald-400">Now we onboard the world.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Live. Open source. Looking for partners, grants, and integrations.
      </motion.p>

      <motion.div
        className="max-w-lg w-full space-y-0 mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {resources.map((res, i) => (
          <motion.div
            key={res.label}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-28">{res.label}</span>
              <span className="text-xs font-mono text-foreground">{res.value}</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 border border-border text-muted-foreground">
              {res.tag}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="flex items-center gap-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-secondary)' }}>
            tributary.so
          </div>
          {/* <div className="text-xs text-muted-foreground">Stripe made internet payments invisible.</div> */}
          {/* <div className="text-xs text-muted-foreground">We do the same for Solana.</div> */}
          <div className="mt-3 text-xs text-emerald-400/80 font-bold">
            Looking for teams that want to charge stablecoins.
          </div>
        </div>
        <QRCodeGenerator url="https://tributary.so" text="" size="100px" />
      </motion.div>
    </div>
  )
}
