import { motion } from 'framer-motion'

const models = [
  {
    name: 'ONE TIME',
    desc: 'Fixed amount, paid once.',
    example: 'A checkout button for anything, digital goods, event tickets, one-off purchases.',
    icon: '1x',
    accent: 'from-blue-500/10 to-transparent',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  {
    name: 'SUBSCRIPTION',
    desc: 'Same amount, every month. Cancel anytime.',
    example: 'Netflix-style billing. SaaS products, memberships, premium access ➡ predictable revenue.',
    icon: '~',
    accent: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  {
    name: 'MILESTONE',
    desc: 'Up to 4 phases. Funds locked until work is delivered.',
    example: 'Pay freelancers in stages. Escrow without the middleman, trust through code, not contracts.',
    icon: '4p',
    accent: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  {
    name: 'PAY-AS-YOU-GO',
    desc: 'Charge per use. No manual invoicing.',
    example: 'Per API call, per gigabyte, per action, If you can count it, you can bill for it.',
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
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
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
        One approval,
        <br />
        <span className="text-emerald-400">four ways to get paid</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        One approval, unlimited policies. Covering every way your business earns.
      </motion.p>

      <div className="grid grid-cols-2 gap-4 max-w-3xl w-full">
        {models.map((model, i) => (
          <motion.div
            key={model.name}
            className={`border ${model.border} bg-linear-to-br ${model.accent} p-6 relative overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <div
              className={`absolute top-3 right-4 text-3xl font-bold ${model.text} opacity-50`}
              style={{ fontFamily: 'var(--font-secondary)' }}
            >
              {model.icon}
            </div>
            <div className={`text-xs uppercase tracking-[0.2em] font-bold ${model.text} mb-2`}>{model.name}</div>
            <div className="text-sm text-foreground mb-1">{model.desc}</div>
            <div className="text-[11px] text-muted-foreground leading-snug">{model.example}</div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-xs text-muted-foreground italic mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <p className="ml-1">One protocol. Four models today. More tomorrow. Unlimited policies per user.</p>
      </motion.p>
    </div>
  )
}
