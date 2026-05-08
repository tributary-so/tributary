import { motion } from 'framer-motion'

const MONTHS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']

const items = [
  {
    label: 'Growth',
    detail: 'takes precedence over dev',
    start: 0,
    span: 7,
    bar: 'bg-emerald-500/25 border border-emerald-500/50',
    text: 'text-emerald-400',
    boxShadow: 'inset 1px 0 0 0 rgba(16, 185, 129, 0.5)',
    maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
    badge: 'ONGOING',
    highlight: true,
  },
  {
    label: 'Payment Flows',
    detail: 'all payment models',
    start: 0,
    span: 2,
    bar: 'bg-sky-500/20 border border-sky-500/40',
    text: 'text-sky-400',
  },
  {
    label: 'DevEx & Self-Hosting',
    detail: 'docker-compose, guides',
    start: 1,
    span: 1,
    bar: 'bg-violet-500/20 border border-violet-500/40',
    text: 'text-violet-400',
  },
  {
    label: 'Contract Audit',
    detail: 'audit + resolve findings',
    start: 1,
    span: 3,
    bar: 'bg-amber-500/20 border border-amber-500/40',
    text: 'text-amber-400',
  },
  {
    label: 'Stripe Billing',
    detail: 'tributary as settlement layer',
    start: 2,
    span: 5,
    bar: 'bg-indigo-500/20 border border-indigo-500/40',
    boxShadow: 'inset 1px 0 0 0 rgba(99, 102, 241, 0.4)',
    maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
    text: 'text-indigo-400',
  },
  {
    label: 'Solana Subscriptions',
    detail: 'Foundation subscription program',
    start: 3,
    span: 3,
    bar: 'bg-teal-500/20 border border-teal-500/40',
    text: 'text-teal-400',
  },
  {
    label: 'Privacy Layer',
    detail: 'C-SPL (Arcium), Umbra, or IKA',
    start: 3,
    span: 4,
    bar: 'bg-rose-500/15 border border-rose-500/40',
    boxShadow: 'inset 1px 0 0 0 rgba(244, 63, 94, 0.4), inset -1px 0 0 0 rgba(244, 63, 94, 0.4)',
    maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
    text: 'text-rose-400',
    // badge: '6 MO',
  },
]

export default function SlideRoadmap() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Roadmap
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-emerald-500">Next 6 months.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Growth-first. Product, security, and adoption follow.
      </motion.p>

      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-[160px_1fr] mb-1">
          <div />
          <div className="grid grid-cols-6">
            {MONTHS.map((m) => (
              <div
                key={m}
                className="text-[9px] text-center text-muted-foreground/60 uppercase tracking-wider font-semibold"
              >
                {m}
              </div>
            ))}
          </div>
        </div>

        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className={`grid grid-cols-[160px_1fr] gap-2 items-center py-1.5 border-b border-border/30 last:border-0 ${
              item.highlight ? 'bg-emerald-500/5 -mx-2 px-2 border-l-2 border-l-emerald-400' : ''
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
          >
            <div className="flex flex-col">
              <span className={`text-[11px] font-semibold ${item.text}`}>{item.label}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{item.detail}</span>
            </div>
            <div className="relative h-5">
              <div className="absolute inset-0 grid grid-cols-6">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="border-l border-border/20 first:border-l-0" />
                ))}
              </div>
              <motion.div
                className={`absolute top-0.5 h-4 rounded-sm ${item.bar} flex items-center overflow-hidden`}
                style={{
                  left: `${(item.start / 6) * 100}%`,
                  width: `${(item.span / 6) * 100}%`,
                  transformOrigin: '0% 50%',
                  boxShadow: item?.boxShadow,
                  maskImage: item?.maskImage,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              >
                {item.badge && (
                  <span
                    className={`text-[7px] font-bold tracking-wider px-1.5 whitespace-nowrap ${item.text} opacity-80`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-emerald-500/30 bg-emerald-500/5 px-6 py-3 max-w-2xl text-center mt-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <p className="text-xs text-foreground">
          <span className="font-bold text-emerald-400">Growth takes precedence</span> over all development work. Every
          item ships faster if adoption demands it.
        </p>
      </motion.div>
    </div>
  )
}
