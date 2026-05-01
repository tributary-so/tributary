import { motion } from 'framer-motion'

const models = [
  {
    name: 'ONE TIME',
    desc: 'Fixed amount, fixed receiver, paid once.',
    icon: '1x',
    accent: 'from-blue-500/10 to-transparent',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  {
    name: 'SUBSCRIPTION',
    desc: 'Fixed amount, fixed frequency. Cancel anytime.',
    icon: '~',
    accent: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  {
    name: 'MILESTONE',
    desc: 'Up to 4 phases. Escrow-style. Perfect for freelance.',
    icon: '4p',
    accent: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  {
    name: 'PAY-AS-YOU-GO',
    desc: 'Usage-based. Ideal for APIs, agents, metered services.',
    icon: '$',
    accent: 'from-purple-500/10 to-transparent',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
  },
]

export default function SlideModels() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground/50 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Payment Models
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        One delegation,
        <br />
        <span className="text-emerald-400">four payment models</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        One delegation, unlimited policies. Extending the Solana Token Program.
      </motion.p>

      <div className="grid grid-cols-2 gap-4 max-w-3xl w-full">
        {models.map((model, i) => (
          <motion.div
            key={model.name}
            className={`border ${model.border} bg-gradient-to-br ${model.accent} p-6 relative overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div
              className={`absolute top-3 right-4 text-3xl font-bold ${model.text} opacity-20`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {model.icon}
            </div>
            <div className={`text-xs uppercase tracking-[0.2em] font-bold ${model.text} mb-2`}>{model.name}</div>
            <div className="text-sm text-muted-foreground">{model.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground/40 italic mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        One program. Four models. Unlimited policies per user.
      </motion.p>
    </div>
  )
}
