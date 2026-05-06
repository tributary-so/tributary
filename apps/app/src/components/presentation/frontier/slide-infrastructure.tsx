import { motion } from 'framer-motion'

const layers = [
  { web2: 'Visa / Mastercard', tributary: 'On-chain protocol', label: 'Payment Rail' },
  { web2: 'Stripe, Adyen, PayPal', tributary: 'Your registered gateway', label: 'Processor' },
  { web2: 'Stripe Checkout', tributary: 'Hosted checkout page', label: 'Checkout' },
  { web2: 'Webhook signature', tributary: 'JWT + JWKS + On chain', label: 'Verification' },
]

export default function SlideInfrastructure() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Business Model
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        We&apos;re the rails.
        <br />
        <span className="text-emerald-400">You&apos;re Stripe.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Tributary is the credit card network. You build the Stripe on top.
      </motion.p>

      <div className="max-w-2xl w-full space-y-0 mb-4">
        <motion.div
          className="grid grid-cols-3 border border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-r border-border">
            Layer
          </div>
          <div className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-r border-border">
            Web2 Analogy
          </div>
          <div className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-400 border-b border-border">
            Tributary
          </div>
        </motion.div>
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            className="grid grid-cols-3 border-b border-l border-r border-border"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
          >
            <div className="px-4 py-2 text-xs font-semibold text-foreground border-r border-border">{layer.label}</div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-r border-border">{layer.web2}</div>
            <div className="px-4 py-2 text-xs text-emerald-400 font-medium">{layer.tributary}</div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-2xl w-full grid grid-cols-2 gap-3">
        {[
          { title: 'Register Your Business', desc: 'Set up your gateway with custom fees and branding' },
          { title: 'Earn on Every Transaction', desc: '1% protocol fee + your own gateway fee on top' },
          { title: 'Zero Custody Risk', desc: 'We never hold funds — we provide the logic, you provide the service' },
          { title: 'Open-Source', desc: 'Self-hostable and extensible for any payment product' },
        ].map((feat, i) => (
          <motion.div
            key={feat.title}
            className="border border-border bg-muted/10 px-4 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 + i * 0.08 }}
          >
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">{feat.title}</div>
            <div className="text-xs text-muted-foreground">{feat.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
