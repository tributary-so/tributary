import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Checkout Link',
    desc: 'Your customer clicks a link and signs once.',
  },
  {
    num: '02',
    title: 'Accept Payment',
    desc: 'One approval. Payments run automatically. No reminders, no manual re-auth.',
  },
  {
    num: '03',
    title: 'Automatic Execution',
    desc: 'Gateway signer triggers payments on schedule. Permissionless, trustless.',
  },
  {
    num: '04',
    title: 'Verify Anywhere',
    desc: 'JWT verification — 3 lines of code, any language, no crypto knowledge.',
  },
]

export default function SlideFlow() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        How It Works
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Sign once.
        <br />
        <span className="text-emerald-400">Pay automatically.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Token delegation means your customer approves once. Every subsequent payment is automatic. No passwords, no
        card numbers, no manual re-auth. No transaction signing.
      </motion.p>

      <div className="flex gap-3 max-w-4xl w-full mb-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            className="flex-1 border border-border bg-muted"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div className="px-4 py-3 flex items-start gap-3">
              <span
                className="text-lg font-bold text-emerald-400 shrink-0"
                style={{ fontFamily: 'var(--font-secondary)' }}
              >
                {step.num}
              </span>
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">{step.title}</div>
                <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{step.desc}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-emerald-500/30 bg-emerald-500/5 px-6 py-4 max-w-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p className="text-sm text-foreground mb-2">
          <span className="font-bold">The Key Insight:</span> Merchants never need to talk crypto or blockchain.
        </p>
        <p className="text-xs text-muted-foreground">
          Tributary&apos;s Checkout flow means accepting stablecoins is as simple as verifying a signed token <br />
          Any programming language. No crypto knowledge required.
        </p>
      </motion.div>
    </div>
  )
}
