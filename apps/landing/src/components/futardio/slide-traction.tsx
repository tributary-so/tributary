import { motion } from "framer-motion";

const metrics = [
  { value: "6+", label: "Integrations", accent: false },
  { value: "4K+", label: "Transfers executed", accent: false },
  { value: "$10k", label: "Transfered", accent: false },
  { value: "15%", label: "M.o.M growth", accent: false },
  // { value: '$0', label: 'Marketing spent', accent: true },
  { value: "$0", label: "Raised", accent: true },
];

export default function SlideTraction() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-3 sm:px-8">
      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: "var(--font-secondary)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Built part-time.
        <br />
        <span className="text-emerald-400">Growing full-time.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-8 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Smart contract live on mainnet. GTM launched
      </motion.p>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="flex flex-col items-center px-3 sm:px-5 py-3 sm:py-4 border border-border min-w-[100px] sm:min-w-0"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
          >
            <span
              className={`text-xl sm:text-2xl font-bold ${
                m.accent ? "text-amber-400" : "text-emerald-400"
              }`}
              style={{ fontFamily: "var(--font-secondary)" }}
            >
              {m.value}
            </span>
            <span className="text-[10px] sm:text-sm uppercase tracking-wider text-muted-foreground mt-1">
              {m.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
