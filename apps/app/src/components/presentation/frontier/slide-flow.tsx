import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Checkout Link',
    desc: 'Merchant generates a payment link. User signs once.',
    code: `const { initiate } = useCheckoutSession(baseUrl);\ninitiate({ mode: "subscription",\n           amount: 10,\n           paymentFrequency: "monthly" });`,
  },
  {
    num: '02',
    title: 'JWT Issued',
    desc: 'Tributary mints a cryptographically secured token.',
    code: `Redirect: http://url/success?token=xxxxxxx`,
  },
  {
    num: '03',
    title: 'Verify & Done',
    desc: 'Merchant verifies the JWT. One React hook. Zero backend.',
    code: `const { payload } = useTributaryToken(token);\n// payload.status === "paid"`,
  },
]

export default function SlideFlow() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground/50 mb-4"
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
        Sign once. Pay automatically.
        <br />
        <span className="text-emerald-400">Verify anywhere.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Send user to checkout. Get back a verified JWT. Done.
      </motion.p>

      <div className="flex gap-4 max-w-4xl w-full mb-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            className="flex-1 border border-border bg-muted/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
          >
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <span className="text-lg font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
                {step.num}
              </span>
              <div>
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider">{step.title}</div>
                <div className="text-[10px] text-muted-foreground">{step.desc}</div>
              </div>
            </div>
            {/*
            <div className="px-4 py-3">
              <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                <code>{step.code}</code>
              </pre>
            </div>
            */}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="flex gap-6 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <span className="font-mono">
          <span className="text-emerald-400 font-mono">npm install</span> @tributary-so/sdk-react
        </span>
        <span className="text-border">|</span>
        <span>No web3.js, no wallet adapter, no RPC provider</span>
      </motion.div>

      <motion.p
        className="text-xs text-muted-foreground/40 italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.85 }}
      >
        The entire payment flow without importing a single blockchain library.
      </motion.p>
    </div>
  )
}
