import { motion } from "framer-motion";

const models = [
  {
    name: "SUBSCRIPTION",
    desc: "Same amount, every period.",
    example: "SaaS, memberships, creator support — predictable revenue.",
    icon: "~",
    accent: "from-emerald-500/10 to-transparent",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
  },
  {
    name: "MILESTONE",
    desc: "Up to 4 phases. Funds locked until delivered.",
    example:
      "Freelance, consulting, dev bounties — escrow without the middleman.",
    icon: "4p",
    accent: "from-amber-500/10 to-transparent",
    border: "border-amber-500/20",
    text: "text-amber-400",
  },
  {
    name: "PAY-AS-YOU-GO",
    desc: "Charge per use. No manual invoicing.",
    example:
      "API calls, compute, tokens, usage-based billing — if you can count it, bill for it.",
    icon: "$",
    accent: "from-purple-500/10 to-transparent",
    border: "border-purple-500/20",
    text: "text-purple-400",
  },
  {
    name: "ONE-TIME",
    desc: "Fixed amount, paid once.",
    example: "Invoices, digital goods, event tickets — checkout for anything.",
    icon: "1x",
    accent: "from-blue-500/10 to-transparent",
    border: "border-blue-500/20",
    text: "text-blue-400",
  },
  {
    name: "UP-TO",
    desc: "Flexible cap-based payments.",
    example: '"Up to $50/month" — x402 aligned, perfect for agentic billing.',
    icon: "<>",
    accent: "from-rose-500/10 to-transparent",
    border: "border-rose-500/20",
    text: "text-rose-400",
  },
];

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
        style={{ fontFamily: "var(--font-secondary)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        One approval,
        <br />
        <span className="text-emerald-400">Five payment types.</span>
        <br />
        <span className="text-muted-foreground">Zero custody.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Users approve once via token delegation — payments run automatically.
        <br />
        One approval, unlimited policies.
      </motion.p>

      <div className="grid grid-cols-3 gap-3 max-w-5xl w-full mb-2">
        {models.slice(0, 3).map((model, i) => (
          <motion.div
            key={model.name}
            className={`border ${model.border} bg-linear-to-br ${model.accent} p-4 relative overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
          >
            <div
              className={`absolute top-2 right-3 text-2xl font-bold ${model.text} opacity-50`}
              style={{ fontFamily: "var(--font-secondary)" }}
            >
              {model.icon}
            </div>
            <div
              className={`text-xs uppercase tracking-[0.2em] font-bold ${model.text} mb-1`}
            >
              {model.name}
            </div>
            <div className="text-xs text-foreground mb-1">{model.desc}</div>
            <div className="text-xs text-muted-foreground leading-snug">
              {model.example}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-3xl w-full">
        {models.slice(3).map((model, i) => (
          <motion.div
            key={model.name}
            className={`border ${model.border} bg-linear-to-br ${model.accent} p-4 relative overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
          >
            <div
              className={`absolute top-2 right-3 text-2xl font-bold ${model.text} opacity-50`}
              style={{ fontFamily: "var(--font-secondary)" }}
            >
              {model.icon}
            </div>
            <div
              className={`text-xs uppercase tracking-[0.2em] font-bold ${model.text} mb-1`}
            >
              {model.name}
            </div>
            <div className="text-xs text-foreground mb-1">{model.desc}</div>
            <div className="text-xs text-muted-foreground leading-snug">
              {model.example}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-muted-foreground italic mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        That's five models today. More tomorrow.
      </motion.p>
    </div>
  );
}
