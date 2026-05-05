import { motion } from 'framer-motion'

const milestones = [
  {
    month: 'M 1–2',
    title: 'Complete Payment Flow',
    items: [
      'Up-to payment model in smart contract',
      'JWT checkout flow (issue, verify, refresh)',
      'TributaryVerifier in @tributary-so/payments',
    ],
    success: 'Accept USDC with <10 lines, zero Solana knowledge',
  },
  {
    month: 'M 2–3',
    title: 'Developer Onboarding',
    items: ['Copy-paste integration guides', 'Hosted checkout link generation API', 'Merchant dashboard v2'],
    success: '3+ new merchants from docs alone',
  },
  {
    month: 'M 3–4',
    title: 'Security Audit + x402',
    items: ['Complete security audit', 'Resolve all findings', 'x402 middleware production-hardened'],
    success: 'Audit published, findings resolved',
  },
  {
    month: 'M 4–5',
    title: 'Self-Hosted + Privacy',
    items: ['Docker Compose self-hosting guide', 'Privacy policy specs (Umbra/Arcium)', 'Self-hostable deployment'],
    success: 'Enterprise-ready self-hosting',
  },
  {
    month: 'M  5–6',
    title: 'Growth + Enterprise',
    items: ['Ecosystem partnerships', 'Conference circuit (Breakpoint)', 'Enterprise integration support'],
    success: '10+ live merchants, audit complete',
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
        6 months.
        <br />
        <span className="text-emerald-400">From protocol to platform.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Focused on product completion, security audit, and developer adoption.
      </motion.p>

      <div className="flex flex-col gap-1">
        {milestones.map((ms, i) => (
          <motion.div
            key={ms.month}
            className="flex-1 border border-border p-2 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400" style={{ fontFamily: 'var(--font-secondary)' }}>
                {ms.month}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground">{ms.title}</span>
            </div>
            {/*
            <div className="space-y-1 mb-2">
              {ms.items.map((item, j) => (
                <div key={j} className="flex items-start gap-1.5">
                  <div className="shrink-0 w-0.5 h-0.5 bg-muted-foreground/50 rounded-full mt-1.5" />
                  <span className="text-[10px] text-muted-foreground leading-snug">{item}</span>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-emerald-400/80 italic border-t border-border/50 pt-1.5 mt-1.5">
              {ms.success}
            </div>
          */}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="border border-emerald-500/30 bg-emerald-500/5 px-6 py-3 max-w-2xl text-center mt-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <p className="text-xs text-foreground">
          The <span className="font-bold">$50K security audit</span> is the single gate between today&apos;s product and
          enterprise adoption. With it, integrations move from &ldquo;interesting&rdquo; to
          &ldquo;production-ready.&rdquo;
        </p>
      </motion.div>
    </div>
  )
}
