import { motion } from "framer-motion";

const web2 = [
  { name: "Stripe", value: 225, display: "$225B", delay: 0.1, pct: 100 },
  { name: "PayPal", value: 175, display: "$175B", delay: 0.15, pct: 77.8 },
  { name: "Adyen", value: 110, display: "$110B", delay: 0.25, pct: 48.9 },
];

const web3 = [
  { name: "Superfluid", sub: "EVM", display: "$700M", delay: 0.4, pct: 0.31 },
  { name: "Sablier", sub: "Ethereum", display: "$180M", delay: 0.5, pct: 0.08 },
];

export default function SlideMarket() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-3 sm:px-8">
      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 text-center leading-tight"
        style={{ fontFamily: "var(--font-secondary)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Web2 has Stripe.
        <br />
        <span className="text-muted-foreground">Solana has nothing.</span>
      </motion.h2>
      <div className="flex flex-col justify-center h-full w-full px-3 sm:px-8 py-6 max-w-3xl mx-auto">
        {/* Web2 section */}
        <motion.div
          className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.0 }}
        >
          Web2 — annual recurring payment volume
        </motion.div>

        <div className="flex flex-col gap-2.5 mb-6">
          {web2.map((item) => (
            <motion.div
              key={item.name}
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: item.delay }}
            >
              <span className="w-16 sm:w-[90px] text-xs sm:text-sm text-muted-foreground text-right shrink-0">
                {item.name}
              </span>
              <div className="flex-1 relative h-7 flex items-center">
                <motion.div
                  className="h-7 bg-purple-500 rounded-[4px] origin-left absolute left-0"
                  style={{ width: `${item.pct}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.55,
                    delay: item.delay + 0.05,
                    ease: [0.22, 0.68, 0, 1.2],
                  }}
                />
                <span
                  className="absolute text-sm font-medium text-foreground z-10"
                  style={{ left: `calc(${item.pct}% + 10px)` }}
                >
                  {item.display}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <motion.div
          className="border-t border-border mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        />

        {/* Web3 section */}
        <motion.div
          className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.38 }}
        >
          Web3 — annual recurringrecurring payment volume
        </motion.div>

        <div className="flex flex-col gap-2.5 mb-4">
          {web3.map((item) => (
            <motion.div
              key={item.name}
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: item.delay }}
            >
              <span className="w-16 sm:w-[90px] text-right shrink-0 leading-tight">
                <span className="text-xs sm:text-sm text-foreground">
                  {item.name}
                </span>
                <br />
                <span className="text-[11px] text-muted-foreground opacity-60">
                  {item.sub}
                </span>
              </span>
              <div className="flex-1 relative h-7 flex items-center">
                <motion.div
                  className="h-7 bg-indigo-500 rounded-[4px] origin-left absolute left-0"
                  style={{ width: `${item.pct}%`, minWidth: "3px" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.55,
                    delay: item.delay + 0.05,
                    ease: [0.22, 0.68, 0, 1.2],
                  }}
                />
                <span
                  className="absolute text-sm font-medium text-muted-foreground z-10"
                  style={{ left: `calc(${item.pct}% + 10px)` }}
                >
                  {item.display}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Solana — empty state hero */}
        <motion.div
          className="flex items-center gap-3 mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
        >
          <span className="w-16 sm:w-[90px] text-xs sm:text-sm font-medium text-foreground text-right shrink-0">
            Solana
          </span>
          <div className="flex-1 border-[1.5px] border-dashed border-border rounded-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-muted/40">
            {/* X icon — inline SVG to avoid icon library dependency */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <div>
              <div className="text-sm font-medium text-destructive leading-tight">
                No native solution
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                No subscription processor exists on Solana today
              </div>
            </div>
            <div className="ml-auto text-[11px] font-medium uppercase tracking-wider bg-destructive/10 text-destructive px-2.5 py-1 rounded">
              $0
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
