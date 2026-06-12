"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  BarChart3,
  Coins,
  Heart,
  ShieldCheck,
  TrendingUp,
  Users,
  Bot,
  Skull,
  Building2,
  Landmark,
  Gift,
  Briefcase,
  Cpu,
  Globe,
  Lock,
  Sprout,
} from "lucide-react";
import SlideProblem from "@/components/futardio/slide-problem";
import FabianSchuhProfile from "@/components/futardio/cv";

function Divider() {
  return (
    <div
      className="font-mono text-sm text-muted-foreground/30 select-none"
      aria-hidden="true"
    >
      //
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
      {children}
    </p>
  );
}

// ─── Slide: Hero ─────────────────────────────────────────────────────────────
function SlideHero() {
  return (
    <section className="py-20">
      <div className="flex flex-col gap-6 max-w-4xl text-center lg:text-left lg:items-start">
        <h1 className="text-3xl font-bold leading-snug tracking-tight md:text-4xl lg:text-5xl">
          <span className="text-foreground">
            Stablecoins made money digital.
          </span>
          <br />
          <span className="gradient-text">
            Tributary makes it self-driving.
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
          The composable automation layer for Solana. One approval. Unlimited
          financial products.
        </p>

        <div className="flex flex-wrap gap-3 mt-2 justify-center lg:justify-start">
          <a
            href="https://tributary.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-5 py-2.5 transition-colors"
          >
            tributary.so
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a
            href="mailto:fabian@tributary.so"
            className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground text-sm px-5 py-2.5 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Slide: Market Forces ────────────────────────────────────────────────────
function SlideGrowth() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Market Opportunity</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">$316B in stablecoins. </span>
          <span className="gradient-text">Zero automation.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          $316B market cap. Solana alone holds $15.2B. Stablecoin volume hit
          $33T in 2025 — dwarfing Visa's $16.7T. Yet the vast majority was
          manually triggered. No schedules. No conditions. No automation. The
          Solana Foundation confirmed this gap — they shipped their own
          delegation primitive for recurring payments. The market validated the
          thesis before Tributary raised a single dollar.
        </p>
      </div>

      <div className="border border-border/50 bg-muted/10 p-6">
        <SlideProblem />
      </div>
    </section>
  );
}

// ─── Slide: Pain (Vignettes) ─────────────────────────────────────────────────
function SlidePain() {
  const vignettes = [
    {
      Icon: Building2,
      title: "DAO Treasury",
      scenario: "$50M portfolio. Market moves at 2am.",
      pain: "Someone needs to wake up, check prices, sign a rebalancing transaction. Every time. Manually. Or the portfolio drifts.",
    },
    {
      Icon: Bot,
      title: "AI Agent",
      scenario: "Needs compute. Wants to pay for API calls.",
      pain: "Can't do it without your private key. Hand over full wallet access — or the agent can't function autonomously.",
    },
    {
      Icon: TrendingUp,
      title: "DeFi Trader",
      scenario: "Wants to DCA $200 into SOL every Monday.",
      pain: "Open DEX, connect wallet, approve, swap, sign. Every single week. Set a calendar reminder. Hope you remember.",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Pain</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Money that can't act on its own{" "}
          <span className="gradient-text">is money that can't scale.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Every financial automation that exists in traditional finance — direct
          debits, stop-losses, limit orders, automated investing — is either
          impossible on-chain or requires giving up custody.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {vignettes.map((v, i) => (
          <motion.div
            key={v.title}
            className="border border-border/50 bg-muted/10 p-6 space-y-3"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <v.Icon className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-bold text-foreground">{v.title}</div>
            <div className="text-xs text-muted-foreground italic">
              {v.scenario}
            </div>
            <div className="text-xs text-foreground leading-relaxed">
              {v.pain}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Slide: Dream ─────────────────────────────────────────────────────────────
function SlideDream() {
  const dreams = [
    {
      title: "DAO rebalances automatically",
      desc: "Only when the oracle confirms a 5% drift. Only within approved parameters. Non-custodial the whole time.",
    },
    {
      title: "AI agent pays for compute",
      desc: "Within a $50/day budget. No private keys. No custody. Scoped authority you approved once.",
    },
    {
      title: "$200 into SOL every Monday",
      desc: "Just happens. No reminders. No manual swaps. No signing.",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Dream</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          What if money could act within{" "}
          <span className="gradient-text">boundaries you set?</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {dreams.map((d, i) => (
          <motion.div
            key={d.title}
            className="border border-primary/30 bg-primary/5 p-6 space-y-3"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <div className="text-sm font-bold text-foreground">{d.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {d.desc}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
        <p className="text-sm text-foreground font-medium">
          One approval. Rules you define. Money moves within your boundaries.
        </p>
        <p className="text-sm text-primary font-bold mt-1">
          Non-custodial. Always.
        </p>
      </div>
    </section>
  );
}

// ─── Slide: The Missing Primitive ────────────────────────────────────────────
function SlidePrimitive() {
  return (
    <section className="py-16">
      <div className="mb-10 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Solution</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">
            Tributary: the composable automation layer for{" "}
          </span>
          <span className="gradient-text">self-driving money.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          The core primitive: three layers, infinite compositions. Users
          delegate spending authority once. Tributary never holds funds — it
          pulls within approved limits and routes through any on-chain program.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-0 border border-border/50 max-w-5xl mx-auto">
        {[
          {
            step: "WHEN",
            title: "Trigger Condition",
            color: "text-primary",
            border: "border-primary/20",
            bg: "bg-primary/5",
            items: [
              "Time / schedule",
              "Price oracle",
              "Wallet balance",
              "Governance outcome",
              "Custom logic",
            ],
          },
          {
            step: "PULL",
            title: "Value Transfer",
            color: "text-amber-400",
            border: "border-amber-500/20",
            bg: "bg-amber-500/5",
            items: [
              "Fixed amount",
              "Variable / usage-based",
              "Percentage",
              "Capped (up-to)",
              "Multi-token",
            ],
          },
          {
            step: "ROUTE",
            title: "Destination",
            color: "text-purple-400",
            border: "border-purple-500/20",
            bg: "bg-purple-500/5",
            items: [
              "Wallet",
              "Jupiter (swap)",
              "Meteora / Raydium",
              "Staking / yield",
              "Any Solana program",
            ],
          },
        ].map((s, i) => (
          <motion.div
            key={s.step}
            className={`p-6 border-r border-border/30 last:border-r-0 ${s.bg}`}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <div
              className={`text-3xl font-bold ${s.color} mb-1`}
              style={{ fontFamily: "var(--font-secondary, monospace)" }}
            >
              {s.step}
            </div>
            <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4">
              {s.title}
            </div>
            <ul className="space-y-1.5">
              {s.items.map((item) => (
                <li
                  key={item}
                  className="text-sm text-foreground flex items-center gap-2"
                >
                  <span
                    className={`w-1 h-1 rounded-full ${s.color.replace(
                      "text-",
                      "bg-"
                    )} shrink-0`}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-4 border border-primary/30 bg-primary/5 px-6 py-4 max-w-5xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <p className="text-sm text-foreground">
          <span className="font-bold gradient-text">WHEN → PULL → ROUTE</span>{" "}
          transforms a payment protocol into a composable automation layer.
          Conditional execution via validation CPI gates. Instruction-level
          security on every forward call. Not a payment product — a primitive
          anyone can build on.
        </p>
      </motion.div>
    </section>
  );
}

// ─── Slide: What's Built ──────────────────────────────────────────────────────
const BUILT = [
  { name: "Smart Contract", status: "Mainnet" },
  { name: "TypeScript SDK", npm: "@tributary-so/sdk", status: "Live" },
  {
    name: "React Component Library",
    npm: "@tributary-so/sdk-react",
    status: "Live",
  },
  {
    name: "HTTP 402 Middleware",
    npm: "@tributary-so/sdk-x402",
    status: "Live",
  },
  { name: "Payments SDK", npm: "@tributary-so/payments", status: "Live" },
  { name: "Checkout Page", status: "Live" },
  { name: "Dashboard", status: "Live" },
  { name: "API Server", status: "Live" },
  { name: "Event Indexer", status: "Live" },
];

function SlideBuilt() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Product — Live Today</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">
            Most founders raise, then ship.
          </span>
          <br />
          <span className="gradient-text">We shipped first.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Nine production systems. Zero funding. Recurring payments —
          subscriptions, milestones, pay-as-you-go — live on Solana mainnet
          today. That's no longer the ceiling. It's the foundation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10 max-w-5xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 text-muted-foreground font-medium">
                  Component
                </th>
                <th className="text-left py-3 text-muted-foreground font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {BUILT.map((c) => (
                <tr key={c.name} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <span className="text-foreground text-sm">{c.name}</span>
                    {c.npm && (
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        ({c.npm})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            5 Payment Models. One Approval.
          </p>
          {[
            {
              name: "SUBSCRIPTION",
              desc: "Same amount, every period — SaaS, memberships",
              color: "text-primary",
              border: "border-primary/20",
              bg: "bg-primary/5",
            },
            {
              name: "MILESTONE",
              desc: "Up to 4 phases, funds locked until delivered",
              color: "text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/5",
            },
            {
              name: "PAY-AS-YOU-GO",
              desc: "Charge per use — API calls, compute, tokens",
              color: "text-purple-400",
              border: "border-purple-500/20",
              bg: "bg-purple-500/5",
            },
            {
              name: "ONE-TIME",
              desc: "Fixed amount, paid once — invoices, digital goods",
              color: "text-blue-400",
              border: "border-blue-500/20",
              bg: "bg-blue-500/5",
            },
            {
              name: "UP-TO",
              desc: "Cap-based — x402 aligned, perfect for AI agents",
              color: "text-rose-400",
              border: "border-rose-500/20",
              bg: "bg-rose-500/5",
            },
          ].map((m) => (
            <div
              key={m.name}
              className={`border ${m.border} ${m.bg} px-4 py-2.5 flex items-start gap-3`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-[0.15em] ${m.color} mt-0.5 w-28 shrink-0`}
              >
                {m.name}
              </span>
              <span className="text-xs text-muted-foreground leading-snug">
                {m.desc}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground italic">
            Five models today. More when composability ships.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Slide: What Builders Can Build ──────────────────────────────────────────
const BUILDER_APPS = [
  {
    Icon: BarChart3,
    name: "Generic DCA",
    desc: "Auto-buy any token on schedule. No signing per trade.",
  },
  {
    Icon: Coins,
    name: "Spare Change Investing",
    desc: "Round-up transactions and invest the difference. Acorns for crypto.",
  },
  {
    Icon: Heart,
    name: "Automated Giving",
    desc: "Donate a % of gains. Remove human hesitation from generosity.",
  },
  {
    Icon: ShieldCheck,
    name: "Private Stop-Loss",
    desc: "Encrypted trigger conditions. No visible MEV targets.",
  },
  {
    Icon: TrendingUp,
    name: "On-Chain Limit Orders",
    desc: "Oracle-gated execution. No centralized exchange required.",
  },
  {
    Icon: Users,
    name: "Family Banking",
    desc: "Allowances, spending limits, age-based controls. Set once. Runs forever.",
  },
  {
    Icon: Bot,
    name: "AI Agent Billing",
    desc: "Budget-scoped autonomous agents. x402 aligned. Metered and capped.",
  },
  {
    Icon: Skull,
    name: "Crypto Inheritance",
    desc: "Designate heirs. If activity stops, assets transfer. No surrendering keys.",
  },
  {
    Icon: Landmark,
    name: "Treasury Automation",
    desc: "Rebalance when allocation drifts. No 3am multisig calls.",
  },
  {
    Icon: Gift,
    name: "Creator Platforms",
    desc: "Patreon for crypto. Platform takes a cut, non-custodial.",
  },
  {
    Icon: Briefcase,
    name: "SaaS Billing Resellers",
    desc: "Paddle for Solana. Stripe-for-crypto as a service.",
  },
  {
    Icon: Cpu,
    name: "Machine-to-Machine",
    desc: "Services settle with services. Per-call, per-compute, trustless.",
  },
  {
    Icon: Globe,
    name: "Cross-Chain Automation",
    desc: "CCTP integration. Automate USDC across chains.",
  },
  {
    Icon: Lock,
    name: "Cold Storage Allowance",
    desc: "Funds stay in cold storage. Claim an allowance monthly for expenses.",
  },
  {
    Icon: Sprout,
    name: "Yield Strategies",
    desc: "Auto-compound, auto-rebalance into higher yield. Set and forget.",
  },
];

function SlideBuilders() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Composability</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">One primitive. </span>
          <span className="gradient-text">Infinite products.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Stripe didn't predict Shopify. AWS didn't predict Airbnb. Ethereum
          didn't predict Uniswap. Infrastructure wins because developers
          innovate faster than platform owners. The best products built on
          Tributary will be built by other developers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
        {BUILDER_APPS.map((app, i) => (
          <motion.div
            key={app.name}
            className="border border-border/50 bg-muted/10 hover:border-primary/30 hover:bg-primary/5 p-4 space-y-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            viewport={{ once: true }}
          >
            <app.Icon className="h-6 w-6 text-primary" />
            <div className="text-sm font-bold text-foreground">{app.name}</div>
            <div className="text-xs text-muted-foreground leading-snug">
              {app.desc}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground italic max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
        Each composition is a new product. Each product flows through Tributary.
        Each flow earns protocol fees. Not one business — an ecosystem.
      </p>
    </section>
  );
}

// ─── Slide: Competition ───────────────────────────────────────────────────────
function SlideCompetition() {
  const cols = ["", "Tributary", "Helio", "VelaPay"];
  const rows = [
    ["Model", "Protocol (infra)", "Payment product", "Payment product"],
    ["Custody", "Non-custodial", "Non-custodial", "Privacy (Token-2022)"],
    ["Payment Types", "4+", "1", "1"],
    ["Business Layer", "Yes", "No", "No"],
    ["Self-hostable", "Yes", "No", "No"],
    ["Composable", "Yes (roadmap)", "No", "No"],
    ["Mainnet", "Live", "Live", "Not yet"],
  ];

  const wallets = [
    {
      name: "Squads",
      what: "M-of-N multisig, $10B+ secured",
      play: "Squad vault + Tributary = DAO Milestone Payments",
    },
    {
      name: "LazorKit",
      what: "Passkey-native wallet, gasless",
      play: "Passkey login + Tributary = zero-friction consumer subs",
    },
    {
      name: "Swig",
      what: "65K-role policy engine",
      play: "Swig roles + Tributary = scoped AI agent billing",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Competitive Landscape</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Others exist.
          <br />
          <span className="gradient-text">None let you build your own.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Others build payment products. Tributary is infrastructure — a
          composable automation layer anyone can build on.
        </p>
      </div>

      <div className="overflow-x-auto mb-8 border border-border/50 bg-muted/10 max-w-5xl mx-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th
                  key={col}
                  className={`px-4 py-2.5 text-left uppercase tracking-wider text-xs font-semibold border-b border-border ${
                    i === 0
                      ? "text-muted-foreground"
                      : i === 1
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground bg-muted/20"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/30">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2 ${
                      ci === 0
                        ? "font-semibold text-foreground"
                        : ci === 1
                        ? "gradient-text bg-primary/5 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
          Smart Wallets — Composable, Not Competitive
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {wallets.map((w) => (
            <div key={w.name} className="border border-border bg-muted/20 p-4">
              <div className="text-sm font-bold text-foreground mb-1">
                {w.name}
              </div>
              <div className="text-xs text-muted-foreground mb-2">{w.what}</div>
              <div className="text-xs gradient-text">{w.play}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slide: Traction ─────────────────────────────────────────────────────────
function SlideTraction() {
  const metrics = [
    { value: "6+", label: "Integrations", accent: false },
    { value: "4K+", label: "Transfers executed", accent: false },
    { value: "$10k", label: "Transferred", accent: false },
    { value: "15%", label: "M.o.M growth", accent: false },
    { value: "$0", label: "Raised", accent: true },
  ];
  const integrations = [
    { name: "Allowly.app", desc: "Pocket money for kids and AI agents" },
    { name: "Contribute.so", desc: "Recurring donations platform" },
    { name: "Cash.yumi.finance", desc: "External payment flows" },
    { name: "polycode.dev", desc: "Integration in progress" },
    { name: "orquestra.dev", desc: "Tributary IDL integrated" },
    { name: "p-link.io", desc: "Under active consideration" },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Traction</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Built part-time.
          <br />
          <span className="gradient-text">Growing full-time.</span>
        </h2>
        <p className="text-muted-foreground text-[15px]">
          Smart contract live on mainnet. GTM launched. Real builders
          integrating.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-10 justify-center lg:justify-start">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="flex flex-col items-center px-5 py-4 border border-border min-w-[100px]"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <span
              className={`text-2xl font-bold ${
                m.accent ? "text-amber-400" : "gradient-text"
              }`}
            >
              {m.value}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {m.label}
            </span>
          </motion.div>
        ))}
      </div>

      <h3 className="text-lg font-bold mb-4 text-center lg:text-left">
        Integrations
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {integrations.map((i) => (
          <div
            key={i.name}
            className="border border-border/50 hover:border-primary/30 transition-all p-4"
          >
            <h4 className="font-bold text-sm text-foreground">{i.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Slide: Business Model ────────────────────────────────────────────────────
function SlideModel() {
  const scenarios = [
    {
      label: "Conservative",
      volume: "$50K/mo",
      revenue: "$500/mo",
      builders: "5",
    },
    {
      label: "Moderate",
      volume: "$500K/mo",
      revenue: "$5K/mo",
      builders: "15",
    },
    {
      label: "Optimistic",
      volume: "$2M/mo",
      revenue: "$20K/mo",
      builders: "50",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Business Model</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Protocol revenue from{" "}
          <span className="gradient-text">every automation.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          No custody. No TVL. No lending risk. Revenue scales with adoption, not
          assets held. Every composable flow generates fees. Builders monetize
          their products — Tributary monetizes the infrastructure underneath
          them.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
        <div className="border border-primary/30 bg-primary/5 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-primary font-bold mb-1">
            Protocol Fee
          </div>
          <div className="text-3xl font-bold text-foreground">1%</div>
          <div className="text-xs text-muted-foreground mt-1">
            of every automated transaction
          </div>
        </div>
        <div className="border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-amber-400 font-bold mb-1">
            Business Fee
          </div>
          <div className="text-3xl font-bold text-foreground">Variable</div>
          <div className="text-xs text-muted-foreground mt-1">
            builders set their own layer on top
          </div>
        </div>
        <div className="border border-purple-500/20 bg-purple-500/5 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-purple-400 font-bold mb-1">
            No Custody
          </div>
          <div className="text-3xl font-bold text-foreground">$0 TVL</div>
          <div className="text-xs text-muted-foreground mt-1">
            no balance sheet risk, ever
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-border/50 bg-muted/10 max-w-3xl mx-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Scenario
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Active Builders
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Volume
              </th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                Protocol Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.label} className="border-b border-border/30">
                <td className="px-4 py-3 font-medium text-foreground">
                  {s.label}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.builders}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.volume}</td>
                <td className="px-4 py-3 gradient-text font-medium">
                  {s.revenue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Slide: Roadmap ───────────────────────────────────────────────────────────
function SlideRoadmap() {
  const MONTHS = ["M1", "M2", "M3", "M4", "M5", "M6"];
  const items = [
    {
      label: "Growth",
      detail: "takes precedence over dev",
      start: 0,
      span: 7,
      bar: "bg-primary/25 border border-primary/50",
      text: "text-primary",
      badge: "ONGOING",
      highlight: true,
      maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
    },
    {
      label: "Checkout Flow",
      detail: "for all payment models",
      start: 0,
      span: 2,
      bar: "bg-sky-500/20 border border-sky-500/40",
      text: "text-sky-400",
    },
    {
      label: "DevEx & Self-Hosting",
      detail: "docker-compose, starter kits",
      start: 1,
      span: 1,
      bar: "bg-violet-500/20 border border-violet-500/40",
      text: "text-violet-400",
    },
    {
      label: "Contract Audit",
      detail: "audit + resolve findings",
      start: 1,
      span: 3,
      bar: "bg-amber-500/20 border border-amber-500/40",
      text: "text-amber-400",
    },
    {
      label: "Composable Layer (WHEN/PULL/ROUTE)",
      detail: "self-driving money primitive",
      start: 2,
      span: 5,
      bar: "bg-indigo-500/20 border border-indigo-500/40",
      text: "text-indigo-400",
      maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
    },
    {
      label: "Solana Subscriptions",
      detail: "Foundation subscription program",
      start: 3,
      span: 3,
      bar: "bg-teal-500/20 border border-teal-500/40",
      text: "text-teal-400",
    },
    {
      label: "Privacy Layer",
      detail: "C-SPL (Arcium), Umbra, or IKA",
      start: 3,
      span: 4,
      bar: "bg-rose-500/15 border border-rose-500/40",
      text: "text-rose-400",
      maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>Roadmap</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Growth first. </span>
          <span className="gradient-text">
            Everything else ships faster because of it.
          </span>
        </h2>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="hidden sm:grid grid-cols-[300px_1fr] mb-1">
          <div />
          <div className="grid grid-cols-6">
            {MONTHS.map((m) => (
              <div
                key={m}
                className="text-xs text-center text-muted-foreground/50 uppercase tracking-wider font-semibold"
              >
                {m}
              </div>
            ))}
          </div>
        </div>
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className={`flex flex-col sm:grid sm:grid-cols-[300px_1fr] gap-1 sm:gap-2 items-start sm:items-center py-2 border-b border-border/30 last:border-0 ${
              item.highlight
                ? "bg-primary/5 -mx-2 px-2 border-l-2 border-l-primary"
                : ""
            }`}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            viewport={{ once: true }}
          >
            <div>
              <span className={`text-sm font-semibold ${item.text}`}>
                {item.label}
              </span>
              <span className="text-sm text-muted-foreground ml-2 leading-tight">
                {item.detail}
              </span>
            </div>
            <div className="relative h-5 w-full">
              <div className="absolute inset-0 grid grid-cols-6">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div
                    key={j}
                    className="border-l border-border/20 first:border-l-0"
                  />
                ))}
              </div>
              <motion.div
                className={`absolute top-0.5 h-8 rounded-sm ${item.bar} flex items-center overflow-hidden`}
                style={{
                  left: `${(item.start / 6) * 100}%`,
                  width: `${(item.span / 6) * 100}%`,
                  transformOrigin: "0% 50%",
                  maskImage: item?.maskImage,
                }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
                viewport={{ once: true }}
              >
                {item.badge && (
                  <span
                    className={`text-xs font-bold tracking-wider px-1.5 whitespace-nowrap ${item.text} opacity-80`}
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
        className="border border-primary/30 bg-primary/5 px-6 py-3 max-w-5xl mx-auto text-center mt-6"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        viewport={{ once: true }}
      >
        <p className="text-sm text-foreground">
          <span className="font-bold gradient-text">
            Growth takes precedence
          </span>{" "}
          over all development. Every item ships faster if adoption demands it.
        </p>
      </motion.div>
    </section>
  );
}

// ─── Slide: The Ask ───────────────────────────────────────────────────────────
function SlideAsk() {
  const allocation = [
    {
      pct: "~30%",
      label: "Security Audit",
      desc: "Enterprise-ready contract. Adevar grant covers partial.",
    },
    {
      pct: "~27%",
      label: "Composable Layer",
      desc: "Ship WHEN→PULL→ROUTE. Payment protocol → composable platform.",
    },
    {
      pct: "~27%",
      label: "Growth & Dev Adoption",
      desc: "SDK improvements, integration guides, self-hosting.",
    },
    {
      pct: "~16%",
      label: "Operations",
      desc: "Infrastructure, legal, liquidity pool.",
    },
  ];

  const milestones = [
    {
      month: "M3",
      label: "Audit complete",
      signal: "Enterprise-ready contract",
    },
    {
      month: "M6",
      label: "Composable layer live",
      signal: "First third-party non-payment products",
    },
    {
      month: "M9",
      label: "15+ integrations",
      signal: "Recurring protocol revenue visible",
    },
    {
      month: "M12",
      label: "Seed on real metrics",
      signal: "Composable volume growing, ecosystem emerging",
    },
  ];

  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3 mx-auto text-center lg:text-left lg:mx-0">
        <SectionLabel>The Ask</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Raising </span>
          <span className="gradient-text">&lt;$250K pre-seed.</span>
        </h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          The protocol is built. The market is validated. 4,000+ payments prove
          the primitive works. This completes the audit, ships the composable
          layer, and validates recurring protocol revenue.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-8 max-w-5xl mx-auto">
        {allocation.map((a, i) => (
          <motion.div
            key={a.label}
            className="border border-border/50 bg-muted/10 p-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="text-2xl font-bold gradient-text">{a.pct}</div>
            <div className="text-sm font-bold text-foreground mt-1">
              {a.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">
              {a.desc}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">
          12-Month Arc
        </p>
        <div className="grid sm:grid-cols-4 gap-0 border border-border/50">
          {milestones.map((m, i) => (
            <motion.div
              key={m.month}
              className={`p-4 border-r border-border/30 last:border-r-0 ${
                i === milestones.length - 1
                  ? "border-primary/30 bg-primary/5"
                  : ""
              }`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-xs font-mono text-muted-foreground/50">
                {m.month}
              </div>
              <div className="text-sm font-bold text-foreground mt-1">
                {m.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.signal}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slide: Team ─────────────────────────────────────────────────────────────
function SlideTeam() {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-3xl space-y-3">
        <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
          Team
        </p>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          <span className="text-foreground">Fabian Schuh </span>
          <span className="gradient-text">Dr.-Ing.</span>
        </h2>
      </div>
      <FabianSchuhProfile />
    </section>
  );
}

// ─── Slide: Vision + CTA ──────────────────────────────────────────────────────
function SlideCTA() {
  return (
    <section className="py-16">
      <div className="border border-border bg-muted/20 p-8 sm:p-12 text-center">
        <motion.p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          The Vision
        </motion.p>
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
        >
          Stablecoins made money digital.
          <br />
          <span className="gradient-text">
            Tributary makes it self-driving.
          </span>
        </motion.h2>
        <motion.p
          className="mb-10 text-muted-foreground max-w-2xl mx-auto text-[15px] leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
        >
          A wallet that invests automatically. A DAO that manages treasury
          automatically. An AI agent with its own budget. An application that
          pays another application. Money that follows rules, not humans.
          <br />
          <br />
          <span className="text-foreground font-medium">
            One approval. Unlimited financial products.
          </span>
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <a
            href="mailto:fabian@tributary.so"
            className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground text-sm px-6 py-3 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Get in Touch
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TributaryComposablePitch() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <SlideHero />
      <Divider />
      <SlideGrowth />
      <Divider />
      <SlidePain />
      <Divider />
      <SlideDream />
      <Divider />
      <SlidePrimitive />
      <Divider />
      <SlideBuilt />
      <Divider />
      <SlideBuilders />
      <Divider />
      <SlideCompetition />
      <Divider />
      <SlideTraction />
      <Divider />
      <SlideModel />
      <Divider />
      <SlideRoadmap />
      <Divider />
      <SlideAsk />
      <Divider />
      <SlideTeam />
      <Divider />
      <SlideCTA />
    </main>
  );
}
