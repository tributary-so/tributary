import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Checkout Link',
    desc: 'Your customer clicks a link and signs once.',
  },
  {
    num: '02',
    title: 'Payment Authorized',
    desc: 'No passwords, no card numbers — just a single wallet signature.',
  },
  {
    num: '03',
    title: 'Verify & Done',
    desc: 'You get instant proof of payment. Your customer never returns to this page.',
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
        The Flow
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
        <span className="text-emerald-600">Pay automatically.</span>
        <br />
        <span className="text-emerald-400">Verify anywhere.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Send your customer to checkout. Get back a confirmed payment. Done.
      </motion.p>

      <div className="flex gap-4 max-w-4xl w-full mb-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            className="flex-1 border border-border bg-muted"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
                {step.num}
              </span>
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">{step.title}</div>
                <div className="text-[10px] text-muted-foreground">{step.desc}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.85 }}
      >
        No blockchain libraries required. Works with any frontend framework.
      </motion.p>
    </div>
  )
}
