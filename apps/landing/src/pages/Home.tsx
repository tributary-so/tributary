//import { Link } from "react-router-dom";
import {
  RefreshCw,
  Target,
  TrendingUp,
  Code2,
  ChevronDown,
  Check,
  ArrowRight,
  ShoppingCart,
  HelpCircle,
  //ExternalLink,
  Brain,
  DollarSign,
  Users,
  Wallet,
  ArrowRightLeft,
  Landmark,
  Sprout,
  Droplets,
  Cpu,
  BarChart3,
  Coins,
  Heart,
  Bot,
  Lock,
  Building2,
} from "lucide-react";
import { useEffect } from "react";
import TwitterWall from "@/components/TwitterWall";
import IntegrationsWall from "@/components/IntegrationsWall";
import Mentions from "@/components/Mentions";
import HowToProcessor from "@/components/HowToProcessor";
import HowComposableWorks from "@/components/HowComposableWorks";
import FutardioBanner from "@/components/futardio-banner";

const stats = [
  { label: "Integrations", value: "10+" },
  { label: "Transfers executed", value: "4,000+" },
  { label: "Marketing spent", value: "$0" },
  { label: "Raised", value: "$0" },
];

const paymentTypes = [
  {
    name: "Subscriptions",
    icon: RefreshCw,
    description: "Predictable recurring payments",
    features: [
      "Automated charges",
      "Flexible intervals",
      "Renewal limits",
      "Pause/resume anytime",
    ],
    tags: ["SaaS", "Content", "Memberships"],
    color: "primary",
  },
  {
    name: "Milestones",
    icon: Target,
    description: "Pay as work completes",
    features: [
      "Up to 4 phases",
      "Variable amounts",
      "Escrow security",
      "Time/manual release",
    ],
    tags: ["Freelance", "Consulting", "Projects"],
    color: "accent",
  },
  {
    name: "Pay-as-you-go",
    icon: TrendingUp,
    description: "Only pay for what you use",
    features: [
      "Usage-based billing",
      "Budget protection",
      "Auto period resets",
      "Provider claims",
    ],
    tags: ["AI/LLM", "API", "Cloud"],
    color: "blue-500",
  },
];

const routeTargets = [
  {
    name: "Wallet",
    icon: Wallet,
    description: "Settle directly into any SPL wallet — the live default.",
    tags: ["Payroll", "Payouts", "Settlement"],
    live: true,
  },
  {
    name: "DEX Swap",
    icon: ArrowRightLeft,
    description: "Auto-swap into any token via any DEX before it lands.",
    tags: ["DCA", "Auto-buy", "Rebalancing"],
    live: false,
  },
  {
    name: "Lending Deposit",
    icon: Landmark,
    description: "Route into any lending market to earn or supply yield.",
    tags: ["Auto-supply", "Repay", "Collateral"],
    live: false,
  },
  {
    name: "Staking",
    icon: Sprout,
    description: "Stake or delegate to any staking program on schedule.",
    tags: ["Auto-stake", "Restake", "Delegation"],
    live: false,
  },
  {
    name: "Liquidity Provision",
    icon: Droplets,
    description: "Add or withdraw liquidity from any LP position.",
    tags: ["Auto-LP", "Rebalance", "Yield"],
    live: false,
  },
  {
    name: "Any Whitelisted Program",
    icon: Cpu,
    description:
      "Forward into any Solana program on the allowlist — locked by instruction discriminator.",
    tags: ["Custom", "Composable", "CPI"],
    live: false,
  },
];

const useCases = [
  {
    icon: RefreshCw,
    title: "SaaS Subscriptions",
    description: "Monthly or annual USDC billing for software products.",
  },
  {
    icon: DollarSign,
    title: "Lending & Repayments",
    description:
      "Automated recurring repayments for credit or cash advance products.",
  },
  {
    icon: Users,
    title: "Creator Payments",
    description:
      "Scheduled payouts, subscriptions, memberships, and supporter flows.",
  },
  {
    icon: ShoppingCart,
    title: "Commerce & Checkout",
    description: "Recurring merchant billing and payment-button experiences.",
  },
  {
    icon: Brain,
    title: "AI Agent Payments",
    description:
      "Controlled top-ups, usage-based billing, and recurring service payments.",
  },
  {
    icon: Target,
    title: "Milestone-based Work",
    description:
      "Structured contributor, freelancer, or service-provider payments.",
  },
];

const composableUseCases = [
  {
    icon: BarChart3,
    title: "Generic DCA / Auto-buy",
    description: "Auto-buy any token on schedule. No signing per trade.",
  },
  {
    icon: Coins,
    title: "Spare-change Investing",
    description:
      "Round-up transactions and invest the difference automatically.",
  },
  {
    icon: Heart,
    title: "Automated Giving",
    description:
      "Donate a share of gains. Remove human hesitation from generosity.",
  },
  {
    icon: Building2,
    title: "Treasury Auto-rebalance",
    description: "Rebalance when allocation drifts. No 3am multisig calls.",
  },
  {
    icon: Bot,
    title: "AI-agent Budget Billing",
    description: "Budget-scoped autonomous agents. Metered, capped, hands-off.",
  },
  {
    icon: Cpu,
    title: "Machine-to-Machine Settlement",
    description:
      "Services settle with services. Per-call, per-compute, trustless.",
  },
  {
    icon: Lock,
    title: "Cold-Storage Allowance",
    description:
      "Funds stay in cold storage; claim a monthly allowance for expenses.",
  },
  {
    icon: Sprout,
    title: "Yield Auto-compound",
    description:
      "Auto-compound and rebalance into higher yield. Set and forget.",
  },
];

const faqs = [
  {
    question: "What is Tributary?",
    answer:
      "Tributary is a Solana-native protocol enabling automated, non-custodial recurring payments through token delegation. It supports three claim shapes: Subscriptions, Milestones, and Pay-as-you-go.",
  },
  {
    question: "How does token delegation work?",
    answer:
      "Users sign a single transaction to delegate tokens to Tributary's smart contract. The protocol executes payments automatically without locking funds in escrow. Users retain full custody and can revoke delegation anytime.",
  },
  {
    question: "How do I accept USDC without Solana code?",
    answer:
      "Use Tributary's hosted checkout page. Your user pays via checkout.tributary.so, then lands back on your site with a JWT. You verify the JWT with any standard library—no Solana SDK, no RPC, no keypairs needed.",
  },
  {
    question: "Is Tributary secure?",
    answer:
      "Yes. Funds remain in your wallet. Tributary only has delegated authority for specific amounts. Open-source, audited, revocable anytime. Full CI/CD pipeline with comprehensive testing.",
  },
  {
    question: "Can users cancel subscriptions?",
    answer:
      "Absolutely. Users have full control and can pause, resume, or cancel anytime through wallet or dApp.",
  },
  {
    question: "How can I get my business ready?",
    answer:
      "Head over to the onboarding link in the developers drop down in the navigation and complete the form!",
  },
  {
    question: "What is x402 integration?",
    answer:
      "Tributary powers x402 (HTTP 402 Payment Required) implementation for web micropayments. This enables seamless payment flows over HTTP without breaking the request-response cycle, ideal for API monetization.",
  },
  {
    question: "What does composable mean?",
    answer:
      "Composable means the same PULL primitive — the live token-delegation pull — can route money through any DeFi program on Solana instead of just settling into a wallet. v1 is a payment protocol; v2 turns that primitive into a composable automation layer (WHEN triggers, PULL value, ROUTE destinations).",
  },
  {
    question: "Is composable live?",
    answer:
      "Not yet. v1 payments — subscriptions, milestones, and pay-as-you-go — are live on Solana mainnet today (4,000+ payments executed). The composable layer (WHEN conditions beyond schedules, and ROUTE targets beyond a wallet) is v2, in development. PULL is the only live axis right now.",
  },
  {
    question: "What can money route to?",
    answer:
      "Any whitelisted Solana program — any DEX swap, any lending market, any staking program, any liquidity pool, or a custom program you allowlist. Today money lands in a wallet; tomorrow the same pull can forward into any program before settling, gated by a validation step.",
  },
];

export function HomeFutardio() {
  return (
    <>
      <FutardioBanner />
      <HomeContent />
    </>
  );
}

export default function HomeContent() {
  useEffect(() => {
    const section = sessionStorage.getItem("scrollTo");
    if (section) {
      sessionStorage.removeItem("scrollTo");
      setTimeout(() => {
        document
          .getElementById(section)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);
  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* ─── Hero (the Resolution motif) ─── */}
      <section id="hero" className="py-20">
        <div className="flex flex-col gap-6 text-center lg:text-left lg:items-start">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 px-3 py-1.5 text-accent text-xs font-mono">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Live on Solana · 4,000+ pulls executed
          </div>
          <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl lg:text-5xl">
            <span className="text-foreground">If This</span>
            <br />
            <span className="gradient-text">Then Money.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto lg:mx-0">
            Stablecoins made money digital.{" "}
            <span className="text-foreground">
              Tributary makes it self-driving
            </span>{" "}
            — one primitive, three knobs, that moves money itself within rules
            you set. Non-custodial, on Solana.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row justify-center lg:justify-start">
            <a
              href="https://docs.tributary.so"
              className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              <Code2 className="h-4 w-4" />
              Read the Docs
            </a>
            <a
              href="https://app.tributary.so"
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              See it running <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── Setup + Conflict: inert money ─── */}
      <section id="conflict" className="py-16">
        <div className="mb-10 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            The Problem
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">
              Stablecoins made money digital.
            </span>{" "}
            <span className="gradient-text">It&apos;s still inert.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            ~$300B sits on chain — instant, global, native. But it only moves
            when a human signs, and only to where that human manually sends it.
            No schedules. No conditions. No autonomy. Every
            &quot;automation&quot; in crypto is either a custodial bot that
            holds your keys, or a calendar reminder that still needs you to
            sign.{" "}
            <span className="text-foreground">
              Money that can&apos;t act on its own is money that can&apos;t
              scale.
            </span>
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
          {[
            {
              Icon: Building2,
              title: "DAO Treasury",
              scenario: "$50M portfolio. Market moves at 2am.",
              pain: "Someone has to wake up, check prices, and sign a rebalance. Every time. Manually. Or the portfolio drifts.",
            },
            {
              Icon: Brain,
              title: "AI Agent",
              scenario: "Needs compute. Wants to pay for its own API calls.",
              pain: "It can&apos;t — not without your private key. Hand over full wallet access, or the agent can&apos;t function autonomously.",
            },
          ].map((v) => (
            <div
              key={v.title}
              className="border border-border/50 bg-muted/10 p-6 space-y-3"
            >
              <v.Icon className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-bold text-foreground">{v.title}</div>
              <div className="text-xs text-muted-foreground italic">
                {v.scenario}
              </div>
              <div className="text-xs text-foreground leading-relaxed">
                {v.pain}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Improved User Experience
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">How </span>
            <span className="gradient-text">It Works</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Solana-native delegation. Users approve payment logic—funds do not
            need to be locked in escrow.
          </p>
        </div>
        <HowToProcessor />
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── The Primitive: WHEN / PULL / ROUTE ─── */}
      <section id="primitive" className="py-16">
        <div className="mb-10 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            The Primitive
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">Three knobs. </span>
            <span className="gradient-text">Infinite compositions.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Users delegate spending authority once. Tributary never holds funds
            — it pulls within approved limits and routes through any on-chain
            program. One approval. Rules you define. Money moves within your
            boundaries.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-0 border border-border/50 max-w-5xl">
          {[
            {
              step: "WHEN",
              title: "Trigger Condition",
              status: "PARTIAL",
              color: "text-primary",
              border: "border-primary/20",
              bg: "bg-primary/5",
              items: [
                { label: "Time / schedule", live: true },
                { label: "Price oracle", live: false },
                { label: "Wallet balance", live: false },
                { label: "Governance outcome", live: false },
                { label: "Custom logic", live: false },
              ],
            },
            {
              step: "PULL",
              title: "Value Transfer",
              status: "LIVE",
              color: "text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/5",
              items: [
                { label: "Fixed amount", live: true },
                { label: "Variable / usage-based", live: true },
                { label: "Percentage", live: true },
                { label: "Any token", live: true },
              ],
            },
            {
              step: "ROUTE",
              title: "Destination",
              status: "PARTIAL",
              color: "text-purple-400",
              border: "border-purple-500/20",
              bg: "bg-purple-500/5",
              items: [
                { label: "Wallet", live: true },
                { label: "DEX swap", live: false },
                { label: "Lending deposit", live: false },
                { label: "Staking", live: false },
                { label: "Liquidity provision", live: false },
                { label: "Any whitelisted Solana program", live: false },
              ],
            },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-6 border-r border-border/30 last:border-r-0 ${s.bg}`}
            >
              <div
                className={`text-3xl font-bold ${s.color} mb-1`}
                style={{ fontFamily: "var(--font-secondary, monospace)" }}
              >
                {s.step}
              </div>
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
                {s.title}
                <span
                  className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 ${
                    s.status === "LIVE"
                      ? "text-accent border border-accent/30"
                      : "text-muted-foreground/60 border border-border"
                  }`}
                >
                  {s.status === "LIVE" ? "● LIVE" : s.status}
                </span>
              </div>
              <ul className="space-y-1.5">
                {s.items.map((item) => (
                  <li
                    key={item.label}
                    className="text-sm text-foreground flex items-center gap-2"
                  >
                    <span
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        item.live
                          ? s.color.replace("text-", "bg-")
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <span
                      className={item.live ? "" : "text-muted-foreground/70"}
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 border border-primary/30 bg-primary/5 px-6 py-4 max-w-5xl">
          <p className="text-sm text-foreground">
            <span className="font-bold text-amber-400">PULL is live</span> —
            recurring payments on mainnet today.{" "}
            <span className="font-bold gradient-text">WHEN and ROUTE</span>{" "}
            extend it into a composable automation layer.
          </p>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Execution Comparison: PaymentPolicy vs ComposablePolicy ── */}
      <section id="execution-comparison" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Execution Paths
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">One primitive. </span>
            <span className="gradient-text">Two ways to settle.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            The live PaymentPolicy pulls and settles in a single CPI. The
            roadmap ComposablePolicy adds a validation gate and routes the pull
            through any allowlisted Solana program before settling. Same PULL
            axis, different ROUTE.
          </p>
        </div>
        <HowComposableWorks />
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── Payment Models ─── */}
      {/* ─── Proof it runs: the minimal config is live ─── */}
      <section id="payment-models" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Proof It Runs
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">The simplest config </span>
            <span className="gradient-text">is already live.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Turn one knob of each axis —{" "}
            <span className="text-foreground">WHEN</span>=schedule,{" "}
            <span className="text-foreground">PULL</span>=any of the three claim
            shapes, <span className="text-foreground">ROUTE</span>=wallet — and
            the primitive becomes recurring payments. That minimal config has
            executed{" "}
            <span className="text-foreground">4,000+ pulls on mainnet</span>,
            used by six teams. The cards below are the live PULL axis — the same
            shapes the full config will compose with.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {paymentTypes.map((type) => (
            <div
              key={type.name}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <type.icon className={`h-6 w-6 text-${type.color}`} />
                  <div className="flex flex-wrap gap-1">
                    {type.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted/30 px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <h3 className="font-bold text-lg">{type.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
                <ul className="space-y-1">
                  {type.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-3 w-3 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── ROUTE Targets ─── */}
      <section id="route-targets" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            ROUTE Targets
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">Where the money </span>
            <span className="gradient-text">lands.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            The <span className="text-foreground">ROUTE axis</span> decides the
            destination. Today a pull settles into a wallet. Tomorrow the same
            pull can route through any Solana program before settling —
            vendor-neutral by design.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routeTargets.map((target) => (
            <div
              key={target.name}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <target.icon className="h-5 w-5 text-primary" />
                  <span
                    className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 ${
                      target.live
                        ? "text-accent border border-accent/30"
                        : "text-muted-foreground/60 border border-border"
                    }`}
                  >
                    {target.live ? "● LIVE" : "NEXT"}
                  </span>
                </div>
                <h3 className="font-medium">{target.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {target.description}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {target.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-muted/30 px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground italic">
          Today money lands in a wallet. Tomorrow it can land anywhere a Solana
          program will take it.
        </p>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Social Proof ── */}
      <section id="social-proof" className="space-y-12 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-foreground">Rails are live. </span> We are{" "}
            <span className="gradient-text">accelerating!</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            For infrastructure, organic pull is the strongest leading indicator.
          </p>
        </div>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center space-y-2">
                <div className="font-mono text-sm text-muted-foreground">
                  {label}
                </div>
                <div className="text-2xl font-bold gradient-text">{value}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4"></div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Developer Quick Links ── */}
      {/*
      <section id="quick-links" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Payment Models
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">Start </span>
            <span className="gradient-text">building.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            We prioritize an exceptional developer experience, enabling you to
            get started quickly and become productive from day one.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: "Docs",
              href: "https://docs.tributary.so",
              icon: Code2,
            },
            {
              label: "App",
              href: "https://app.tributary.so",
              icon: ArrowRightLeft,
            },
            {
              label: "Checkout",
              href: "https://checkout.tributary.so",
              icon: ShoppingCart,
            },
            {
              label: "npm",
              href: "https://npmjs.com/package/@tributary-so/sdk",
              icon: Wallet,
            },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border/50 hover:border-primary/30 transition-all p-4 flex items-center gap-3 group"
            >
              <link.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {link.label}
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
            </a>
          ))}
        </div>
        <div className="mt-6">
          <TerminalCard
            filename="terminal"
            language="bash"
            code={`$ npm install @tributary-so/sdk`}
          />
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      */}

      <section id="trusted-by" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Around the world
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">Trusted by </span>
            <span className="gradient-text">Solana builders.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Developers and teams building on Solana trust Tributary to handle
            the hard parts.
          </p>
        </div>
        <TwitterWall />
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Final CTA ── */}
      {/*
      <section
        id="cta-top"
        className="max-w-4xl mx-auto px-6 pb-8 text-center py-16"
      >
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          <span className="text-foreground">Build decentralized payments</span>
          <br />
          <span className="gradient-text">on Solana.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10">
          The protocol is built. The checkout is live. The SDKs are shipped.
          Looking for design partners, ecosystem grants, and teams that want to
          charge stablecoins.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="https://docs.tributary.so"
            className="btn-primary text-base px-8 py-4"
          >
            Read the Docs
          </a>
          <Link
            to="mailto:info@tributary.so"
            className="btn-secondary text-base px-8 py-4"
          >
            Contact / Integrate
          </Link>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>
      */}

      {/* ─── Who Is Using It ─── */}
      <section id="integrations" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Integrations
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Who Is Using Tributary{" "}
            <span className="gradient-text">Right Now?</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Already being used in real product environments.
          </p>
        </div>
        <IntegrationsWall />
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── Use Cases ─── */}
      <section id="use-cases" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Use-Cases
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">
              Tributary, the protocol, the{" "}
            </span>
            <span className="gradient-text">Enabler</span>
          </h2>
          <p className="text-muted-foreground">
            With tributary, you can serve important categories. That is part of
            what gives it upside.
          </p>
        </div>

        {/* Tier 1 — live today */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[10px] font-mono tracking-wider text-accent border border-accent/30 px-2 py-1">
            ● LIVE TODAY
          </span>
          <span className="text-xs text-muted-foreground italic">
            Payments-layer use cases running on mainnet now.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-3">
                <useCase.icon className="h-5 w-5 text-primary" />
                <h3 className="font-medium">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {useCase.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-10">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
            Next: unlocked by composability
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Tier 2 — when composable ships */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[10px] font-mono tracking-wider text-muted-foreground/70 border border-border px-2 py-1">
            WHEN COMPOSABLE SHIPS
          </span>
          <span className="text-xs text-muted-foreground italic">
            New categories that become trivial once WHEN→PULL→ROUTE is live.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {composableUseCases.map((useCase) => (
            <div
              key={useCase.title}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-3">
                <useCase.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {useCase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            FAQs
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Still Questions?
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Everything you need to know about Tributary.
          </p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group border border-border/50 hover:border-primary/30 transition-all"
            >
              <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:text-primary">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                  {faq.question}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 14. Final CTA ─── */}
      <section id="cta" className="py-16">
        <div className="border border-border bg-muted/20 p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Live, Powerful, and Open for Builders
          </h2>
          <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
            A live, well-built infrastructure product in an important category,
            already proving itself in real use cases, with obvious room to grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://docs.tributary.so"
              className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              <Code2 className="h-4 w-4" />
              Read the Docs
            </a>
            <a
              href="https://app.tributary.so"
              className="border bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              Try the App
            </a>
            <a
              href="https://checkout.tributary.so"
              className="border bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              <ShoppingCart className="h-4 w-4" />
              Try Checkout
            </a>
            <a
              href="mailto:info@tributary.so"
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              Contact / Integrate
            </a>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <Mentions />
      </div>
    </main>
  );
}
