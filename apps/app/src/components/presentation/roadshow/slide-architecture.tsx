import { motion } from 'framer-motion'

const layers = [
  { web2: 'Visa / Mastercard', tributary: 'On-chain program (Rust)', label: 'Payment Rail' },
  { web2: 'Stripe, Adyen', tributary: 'Your registered gateway', label: 'Processor' },
  { web2: 'Stripe Checkout', tributary: '(Self-)Hosted checkout', label: 'Checkout' },
  { web2: 'Webhook signature', tributary: 'JWT + JWKS + On-chain verify', label: 'Verification' },
  { web2: 'Stripe SDK', tributary: 'TS + React + x402 + payments', label: 'SDK' },
]

const components = [
  { name: 'Smart Contract', status: 'Mainnet', detail: 'Ottersec verified, >95% coverage' },
  { name: 'TypeScript SDK', status: 'Live', detail: '@tributary-so/sdk' },
  { name: 'React Components', status: 'Live', detail: '@tributary-so/sdk-react' },
  { name: 'HTTP 402 Middleware', status: 'Live', detail: '@tributary-so/sdk-x402' },
  { name: 'Payments SDK', status: 'Live', detail: '@tributary-so/payments' },
  { name: 'Hosted Checkout', status: 'Live', detail: 'checkout.tributary.so' },
  { name: 'API Server', status: 'Live', detail: 'REST + WebSocket + Kafka' },
  { name: 'Event Indexer', status: 'Live', detail: 'Real-time on-chain indexing' },
]

export default function SlideArchitecture() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Complete Protocol Stack
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Not a feature.
        <br />
        <span className="text-emerald-400">Infrastructure.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Full payment stack — from smart contract to checkout page. All bootstrapped, $0 raised.
      </motion.p>

      <div className="flex gap-6 max-w-4xl w-full">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Web2 → Tributary Mapping
          </div>
          <motion.div
            className="border-collapse w-full"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <table className="w-full text-xs border border-border">
              <thead>
                <tr>
                  <th className="px-3 py-1 text-left uppercase tracking-wider font-semibold text-muted-foreground border-b border-r border-border bg-muted/30">
                    Layer
                  </th>
                  <th className="px-3 py-1 text-left uppercase tracking-wider font-semibold text-muted-foreground border-b border-r border-border bg-muted/30">
                    Web2
                  </th>
                  <th className="px-3 py-1 text-left uppercase tracking-wider font-semibold text-emerald-400 border-b border-border bg-emerald-500/5">
                    Tributary
                  </th>
                </tr>
              </thead>
              <tbody>
                {layers.map((layer) => (
                  <tr key={layer.label} className="border-b border-border/50">
                    <td className="px-3 py-1.5 font-semibold text-foreground border-r border-border/50">
                      {layer.label}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground border-r border-border/50">{layer.web2}</td>
                    <td className="px-3 py-1.5 text-emerald-400 font-medium">{layer.tributary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            What&apos;s Built (8 Components)
          </div>
          <div className="space-y-0">
            {components.map((comp, i) => (
              <motion.div
                key={comp.name}
                className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <span className="text-xs font-medium text-foreground">{comp.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{comp.detail}</span>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                    {comp.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
