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
  Sprout,
  Cpu,
  BarChart3,
  Coins,
  Heart,
  Bot,
  Lock,
  Building2,
  Zap,
  Gauge,
  Terminal,
} from "lucide-react";
import { useEffect } from "react";
import TwitterWall from "@/components/TwitterWall";
import IntegrationsWall from "@/components/IntegrationsWall";
import Mentions from "@/components/Mentions";
import HowToProcessor from "@/components/HowToProcessor";
import HowComposableWorks from "@/components/HowComposableWorks";
import { TerminalCard } from "@tributary-so/ui";
import { Backdrop } from "@tributary-so/ui";
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
    color: "text-primary",
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
    color: "text-accent",
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
    color: "text-blue-500",
  },
  {
    name: "One-Time",
    icon: Zap,
    description: "Fire once, full lifecycle",
    features: [
      "Fixed amount, single fire",
      "Schedulable (due date)",
      "Optional expiry",
      "Full fee + composable hooks",
    ],
    tags: ["Invoices", "Bonuses", "Escrow release"],
    color: "text-amber-500",
    new: true,
  },
  {
    name: "UpTo",
    icon: Gauge,
    description: "Authorize up to a max, settle actual usage",
    features: [
      "Single-use authorization",
      "Caller-supplied settle (≤ max)",
      "Time-bound [validAfter, deadline)",
      "Recipient-triggerable (x402)",
    ],
    tags: ["x402 / HTTP 402", "LLM sessions", "Compute jobs"],
    color: "text-purple-500",
    new: true,
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
      "Tributary is a Solana-native protocol enabling automated, non-custodial recurring payments through token delegation. It supports five claim shapes: Subscriptions, Milestones, Pay-as-you-go, OneTime (fixed single-shot), and UpTo (single-use variable-amount authorization — the x402 'upto' primitive).",
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
      "It means the same PULL primitive — the live token-delegation pull — can route money through any allowlisted Solana program, not just settle into a wallet. Open the WHEN and ROUTE knobs and the same If/Then composes into automation far beyond payments: validate a condition with Lighthouse, swap via Meteora DLMM, settle to any program.",
  },
  {
    question: "Is composable live?",
    answer:
      "Yes. All three knobs are live on mainnet. The minimal config (WHEN=schedule, PULL=any claim shape, ROUTE=wallet) has executed 4,000+ pulls. The full config adds Lighthouse validation (WHEN) and Meteora DLMM swaps / any allowlisted program (ROUTE) — same primitive, all knobs turned on.",
  },
  {
    question: "What can money route to?",
    answer:
      "Any whitelisted Solana program — DEX swaps (Meteora DLMM is live today), lending deposits, staking, liquidity pools, or a custom program you allowlist. The pull validates via Lighthouse first, then routes through the allowlisted program before settling. Intermediate ATAs are force-emptied so nothing parks in the contract.",
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
      <section id="hero" className="relative py-20">
        <Backdrop variant="grid" />
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
          <p className="text-xl text-foreground max-w-3xl mx-auto lg:mx-0 font-medium">
            Stop pushing your bags.{" "}
            <span className="gradient-text">Let them flow.</span>
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto lg:mx-0">
            Crypto spent fifteen years winning the{" "}
            <span className="text-foreground">balance</span>. Tributary built
            the <span className="text-foreground">riverbed</span> — one
            primitive, three knobs, that lets money{" "}
            <span className="text-foreground">move itself</span> within rules
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

          {/* Skill install — give your AI agent the Tributary skill */}
          <div className="mt-4 w-full max-w-xl mx-auto lg:mx-0">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-mono">
              <Terminal className="h-3 w-3 text-accent" />
              <span>
                Give your AI agent the{" "}
                <span className="text-foreground">Tributary skill</span>
              </span>
            </div>
            <TerminalCard
              filename="bash"
              language="bash"
              code={`$ npx skills@latest tributary-so/tributary`}
            />
          </div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── Setup + Conflict: the signature tax ─── */}
      <section id="conflict" className="py-16">
        <div className="mb-10 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            The Signature Tax
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">
              Stablecoins made money digital.
            </span>{" "}
            <span className="gradient-text">You still push it by hand.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            ~$300B sits on chain — instant, global, native. But every rail
            before Tributary is <span className="text-foreground">push</span>
            -based: you hold a balance, you sign a transfer, the balance drops.
            Every move needs your hand on the keypad.{" "}
            <span className="text-foreground">
              The signature is the tax. The wallet is a wheelbarrow.
            </span>{" "}
            Every "automation" in crypto is either a custodial bot
            that holds your keys, or a calendar reminder that still needs you to
            sign.{" "}
            <span className="text-foreground">
              Money that can't act on its own is money that can't scale.
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
              pain: "It can't — not without your private key. Hand over full wallet access, or the agent can't function autonomously.",
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
            <span className="text-foreground">If This Then Money</span> is
            literally this primitive&apos;s grammar:{" "}
            <span className="text-foreground">WHEN</span> a condition holds,{" "}
            <span className="text-foreground">PULL</span> value and{" "}
            <span className="text-foreground">ROUTE</span> it onward. Delegate
            spending authority once — <em>set the riverbed once</em> — and
            Tributary never holds your funds. It pulls within approved limits
            and routes through any on-chain program. Our banks hold flows, not
            your funds. One approval. Rules you define. Money moves within your
            boundaries.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-0 border border-border/50 max-w-5xl">
          {[
            {
              step: "WHEN",
              title: "Trigger Condition",
              status: "LIVE",
              color: "text-primary",
              border: "border-primary/20",
              bg: "bg-primary/5",
              items: [
                { label: "Time / schedule", live: true },
                { label: "Validation assertions (Lighthouse)", live: true },
                { label: "Price oracle", live: false },
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
              status: "LIVE",
              color: "text-purple-400",
              border: "border-purple-500/20",
              bg: "bg-purple-500/5",
              items: [
                { label: "Wallet", live: true },
                { label: "DEX swap (Meteora DLMM)", live: true },
                { label: "Any allowlisted Solana program", live: true },
                { label: "Lending deposit", live: false },
                { label: "Staking", live: false },
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

        <div className="mt-4 border border-accent/30 bg-accent/5 px-6 py-4 max-w-5xl">
          <p className="text-sm text-foreground">
            <span className="font-bold text-accent">
              All three knobs are live.
            </span>{" "}
            PULL runs on mainnet (4,000+ pulls). WHEN opens with Lighthouse
            validation assertions. ROUTE opens with Meteora DLMM swaps and any
            allowlisted Solana program. Same If/Then, all knobs turned on.
          </p>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Execution: two configs of one primitive ── */}
      <section id="execution-comparison" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            How It Executes
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">One primitive. </span>
            <span className="gradient-text">Two configs.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Not two products — two settings of the same If/Then. The{" "}
            <span className="text-foreground">minimal config</span> (live today)
            pulls and settles in a single CPI. The{" "}
            <span className="text-foreground">full config</span> (next) adds a
            validation gate and routes the pull through any allowlisted Solana
            program before settling. Same PULL axis; the ROUTE knob is what
            opens up.
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

      {/* ─── Composable in Action: hot-wallet topup example ─── */}
      <section id="composable-example" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Composable in Action
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">One policy. </span>
            <span className="gradient-text">Three knobs, fully wired.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            A hot-wallet auto-topup: Lighthouse checks the balance, Meteora
            swaps the token, the recipient gets what they need — all in one
            permissionless pull.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          <div className="space-y-4">
            <div className="border border-border/50 bg-muted/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">WHEN</span>
                <span className="text-xs text-muted-foreground">
                  Lighthouse assertion
                </span>
              </div>
              <p className="text-sm text-foreground">
                Hot wallet USDC balance &lt; 50 USDC
              </p>
              <p className="text-xs text-muted-foreground">
                Validation runs first. If the balance is fine, nothing moves.
              </p>
            </div>
            <div className="border border-border/50 bg-muted/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">PULL</span>
                <span className="text-xs text-muted-foreground">
                  Delegated claim
                </span>
              </div>
              <p className="text-sm text-foreground">
                Pull USDC from the owner's token account within approved limits
              </p>
              <p className="text-xs text-muted-foreground">
                NET-on-pull: fees added on top, gross skimmed before forward.
              </p>
            </div>
            <div className="border border-border/50 bg-muted/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">ROUTE</span>
                <span className="text-xs text-muted-foreground">
                  Meteora DLMM swap
                </span>
              </div>
              <p className="text-sm text-foreground">
                Swap USDC → WSOL, deliver to recipient
              </p>
              <p className="text-xs text-muted-foreground">
                Intermediate ATAs force-emptied. Contract never holds a balance.
              </p>
            </div>
          </div>
          <div>
            <TerminalCard
              filename="auto-topup.ts"
              language="typescript"
              code={`// 1. Build the Lighthouse assertion
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")   // < 50 USDC
  .build();

// 2. Create the composable policy
await sdk.createComposablePolicy({
  tokenMint: USDC,
  recipient: hotWallet,
  forward: { program: METEORA_DLMM },
  validation: guard,
});

// 3. Permissionless execution
//    WHEN: Lighthouse gates the pull
//    PULL: USDC from owner's ATA
//    ROUTE: Meteora swaps USDC → WSOL
//    SETTLE: deliver to recipient, fees skimmed`}
            />
          </div>
        </div>
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
            <span className="text-foreground">PULL</span>=any of the five claim
            shapes, <span className="text-foreground">ROUTE</span>=wallet — and
            the primitive becomes recurring payments. That minimal config has
            executed{" "}
            <span className="text-foreground">4,000+ pulls on mainnet</span>,
            used by six teams. The cards below are the live PULL axis — the same
            shapes the full config composes with.
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
                  <type.icon className={`h-6 w-6 ${type.color}`} />
                  <div className="flex flex-wrap gap-1">
                    {"new" in type && type.new && (
                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 text-accent border border-accent/30">
                        NEW
                      </span>
                    )}
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
                <div className="text-2xl font-bold text-foreground">{value}</div>
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
            What It Unlocks
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">One primitive. </span>
            <span className="gradient-text">Today and tomorrow.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            The minimal config — WHEN=schedule, ROUTE=wallet — is live today
            (the <span className="text-foreground">● LIVE</span> cards). Open
            the other two knobs and the <em>same</em> primitive unlocks the rest
            (the <span className="text-foreground">NEXT</span> cards). Not two
            products — one If/Then, ascending.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ...useCases.map((u) => ({ ...u, live: true })),
            ...composableUseCases.map((u) => ({ ...u, live: true })),
          ].map((useCase) => (
            <div
              key={useCase.title}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <useCase.icon
                    className={`h-5 w-5 ${
                      useCase.live ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 ${
                      useCase.live
                        ? "text-accent border border-accent/30"
                        : "text-muted-foreground/60 border border-border"
                    }`}
                  >
                    {useCase.live ? "● LIVE" : "NEXT"}
                  </span>
                </div>
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
            <span className="text-foreground">Money should </span>
            <span className="gradient-text">move itself.</span>
          </h2>
          <p className="mb-2 text-foreground max-w-xl mx-auto font-medium">
            Stop pushing your bags. Let them flow.
          </p>
          <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
            One primitive, three knobs, live on Solana. Build on it — or back
            the layer underneath every flow. The minimal config runs today; the
            rest is the same If/Then with the knobs turned up.
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
              href="mailto:info@tributary.so"
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              Get in touch
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
