import { motion } from 'framer-motion'
import TerminalCard from '@/components/TerminalCard'

export default function SlideModels() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.h2
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-3 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        We made it simple.
        <br />
        <span className="text-emerald-400">
          5 lines of code.
        </span>
      </motion.h2>

      <div className="grid grid-cols-2 gap-1">
        <div>
          <motion.div
            className="max-w-2xl w-full mt-8 rounded overflow-hidden border border-border bg-black/40"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <TerminalCard
              filename="checkout.ts"
              language="typescript"
              code={`const { initiate } = useCheckoutSession();
initiate({
  recipient,
  amount,
  paymentFrequency: "monthly"});
`}
            />
          </motion.div>
        </div>
        <div>
          <motion.div
            className="max-w-2xl w-full mt-8 rounded overflow-hidden border border-border bg-black/40"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <TerminalCard
              filename="verify.ts"
              language="typescript"
              code={`const { token, payload, loading } = useTributaryToken();
if (loading) return <p>Verifying...</p>;
if (error) return <p>Verification failed: {error}</p>;
if (!payload) return <p>No token found</p>;
return <h1>Subscription Active</h1>;
`}
            />
          </motion.div>
        </div>
      </div>

    </div>
  )
}
