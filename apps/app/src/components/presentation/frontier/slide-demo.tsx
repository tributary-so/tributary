import { motion } from 'framer-motion'

export default function SlideDemo() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Demo
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        One click.
        <br />
        <span className="text-emerald-400">vs approve every transaction.</span>
      </motion.h2>

      <motion.div
        className="w-full max-w-2xl overflow-hidden rounded-sm border border-border bg-black/20"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <video autoPlay muted playsInline loop className="w-full h-auto">
          <source src="/frontier/demo.mp4" type="video/mp4" />
        </video>
      </motion.div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        Sign once. Payments execute automatically. Cancel anytime.
      </motion.p>
    </div>
  )
}
