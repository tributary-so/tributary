import FutardioBanner from "@/components/futardio-banner";
import SlideCompetition from "@/components/futardio/slide-competition";
import SlideMarket from "@/components/futardio/slide-market";
import SlideModels from "@/components/futardio/slide-models";
import SlideProblem from "@/components/futardio/slide-problem";
import SlideRoadmap from "@/components/futardio/slide-roadmap";
import SlideCTA from "@/components/futardio/slide-tam";
import SlideTraction from "@/components/futardio/slide-traction";
import {
  TrendingUp,
  Shield,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Code2,
  Users,
  Target,
  Lock,
  Calendar,
  Eye,
  Layers,
} from "lucide-react";

const builtComponents = [
  { name: "Smart Contract", status: "Mainnet" },
  {
    name: "TypeScript SDK",
    href: "https://sdk.tributary.so",
    npm: "@tributary-so/sdk",
    status: "Live",
  },
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
  {
    name: "Payments SDK",
    npm: "@tributary-so/payments",
    status: "Live",
  },
  {
    name: "Checkout Page",
    href: "https://app.tributary.so",
    status: "Live",
  },
  {
    name: "Dashboard",
    href: "https://app.tributary.so",
    status: "Live",
  },
  {
    name: "API Server",
    href: "https://github.com/tributary-so/tributary/tree/develop/apps/api/",
    status: "Live",
  },
  {
    name: "Event Indexer",
    href: "https://github.com/tributary-so/soltrace",
    status: "Live",
  },
];

const integrations = [
  { name: "Allowly.app", desc: "Pocket money for kids and AI agents" },
  { name: "Contribute.so", desc: "Recurring donations platform" },
  { name: "Cash.yumi.finance", desc: "External payment flows" },
  { name: "polycode.dev", desc: "Integration in progress" },
  { name: "orquestra.dev", desc: "Tributary IDL integrated" },
  { name: "p-link.io", desc: "Under active consideration" },
];

const useOfFunds = [
  {
    category: "Security Audit (budget)",
    total: "<$50,000",
    monthly: "(on demand)",
  },
  {
    category: "Engineering & Development",
    total: "$48,000",
    monthly: "$8,000",
  },
  {
    category: "Marketing & Developer Growth",
    total: "$48,000",
    monthly: "$8,000",
  },
  { category: "Operations (infra, legal)", total: "$6,000", monthly: "$1,000" },
  {
    category: "Liquidity pool (via futardio)",
    total: "~$30,000",
    monthly: "—",
  },
];

const revenueScenarios = [
  {
    label: "Conservative",
    merchants: "5",
    volume: "$50K/mo",
    revenue: "$500/mo",
  },
  { label: "Moderate", merchants: "15", volume: "$500K/mo", revenue: "$5K/mo" },
  {
    label: "Optimistic",
    merchants: "50",
    volume: "$2M/mo",
    revenue: "$20K/mo",
  },
];

const hackathonLinks = {
  frontier: [
    { label: "Pitch Video", href: "https://youtu.be/KwRowt-9448" },
    { label: "Demo Video", href: "https://youtu.be/GHR2WmTtRAQ" },
    { label: "Slides", href: "https://app.tributary.so/#/frontier" },
    {
      label: "Arena",
      href: "https://arena.colosseum.org/projects/explore/tributary-2",
    },
  ],
  cypherpunk: [
    { label: "Pitch Video", href: "https://youtu.be/HwulPezwCSQ" },
    { label: "Demo Video", href: "https://youtu.be/0irXnJaL_Rs" },
    { label: "Tech Demo", href: "https://youtu.be/94tAF2PvMpw" },
    { label: "Slides", href: "https://app.tributary.so/#/hackathon" },
    {
      label: "Arena",
      href: "https://arena.colosseum.org/projects/explore/tributary-1",
    },
  ],
};

export default function Futardio() {
  return (
    <>
      <FutardioBanner />
      <main className="mx-auto max-w-6xl px-4">
        {/* ─── Hero ─── */}
        <section className="py-20">
          <div className="flex flex-col gap-6 text-center lg:text-left lg:items-start">
            <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 px-3 py-1.5 text-primary text-xs font-mono">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Raising $176K — Bootstrapped, $0 Raised
            </div>
            <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl lg:text-5xl">
              <span className="text-foreground">Payment Infrastructure</span>
              <br />
              <span className="gradient-text">for the Solana Economy</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto lg:mx-0">
              Non-custodial recurring payments on Solana. Fully built and
              deployed.
            </p>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Stablecoin Growth ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Market Opportunity
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Stablecoins </span>
              <span className="gradient-text">outgrowing Visa</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Stablecoin transfer volume exceeded $15T in 2024 — rivaling Visa's
              annual throughput. In 2025, stablecoins have 2x Visa's volume.
              On-chain payments are no longer speculative.
            </p>
          </div>
          <div className="border border-border/50 bg-muted/10 p-6">
            <SlideProblem />
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── The Gap ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              The Gap
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Are we missing a huge </span>
              <span className="gradient-text">opportunity on Solana?</span>
            </h2>
            <ul className="text-muted-foreground leading-relaxed text-[15px] space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />
                Recurring Payments have massive volume in web2
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />
                In web3, only a few projects offer recurring payments and chose
                Ethereum/EVM
              </li>
            </ul>
          </div>
          <div className="border border-border/50 bg-muted/10 p-6">
            <SlideMarket />
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── What's Built ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Product
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">What's Built — </span>
              <span className="gradient-text">Live on Mainnet</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              Tributary is the recurring payments stack for Solana. One smart
              contract, multiple payment models, zero custody. Users approve
              once, payments run automatically.
            </p>
          </div>
          <div className="mt-6 border border-border/50 bg-muted/10 p-6">
            <SlideModels />
          </div>
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
                {builtComponents.map((c) => (
                  <tr key={c.name} className="border-b border-border/50">
                    <td className="py-3 pr-4">
                      {c.href ? (
                        <a
                          href={c.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {c.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-foreground">{c.name}</span>
                      )}
                      {c.npm && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          ({c.npm})
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-muted-foreground text-sm">
            Today, Tributary supports 5 Payment Models and can be extended even
            further.
          </p>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Traction & Integrations ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Traction
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Traction & </span>
              <span className="gradient-text">Integrations</span>
            </h2>
          </div>
          <div className="mb-8 border border-border/50 bg-muted/10 p-6">
            <SlideTraction />
          </div>

          <h3 className="text-xl font-bold mb-4">Integrations</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {integrations.map((i) => (
              <div
                key={i.name}
                className="border border-border/50 hover:border-primary/30 transition-all p-5"
              >
                <h4 className="font-bold text-sm">{i.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
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

        {/* ─── Competitive Edge: Payment Protocols ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Competitive Edge
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Payment </span>
              <span className="gradient-text">Protocols</span>
            </h2>
          </div>
          <div className="mt-8 border border-border/50 bg-muted/10 p-6">
            <SlideCompetition />
          </div>
          <div className="space-y-4">
            <div className="border border-primary/20 bg-primary/5 p-6">
              <p className="text-sm text-foreground">
                <strong>Why these aren't threats:</strong> Smart wallets solve{" "}
                <em>authorization</em> (who signs); Tributary solves{" "}
                <em>payment automation</em> (what/when/how much). Neither
                encodes payment schedules, milestone escrow, usage metering, or
                HTTP 402. The play is <strong>integration</strong> — each
                unlocks a market segment Tributary can't reach alone.
              </p>
            </div>
            <div className="border border-accent/20 bg-accent/5 p-6">
              <p className="text-sm text-foreground">
                <strong>The Moat:</strong> Solana's token delegation model means
                a user can only delegate to one protocol at a time.{" "}
                <strong>
                  First-mover here is a technical lock-in, not a marketing
                  claim.
                </strong>{" "}
                Once a user approves Tributary, every recurring payment flows
                through this protocol. Smart wallets increase the surface area
                for that lock-in by bringing more users and agents on-chain.
              </p>
            </div>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Use of Funds ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Use of Funds
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">6 months runway. </span>
              <span className="gradient-text">
                Focused on growth and developer adoption.
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-muted-foreground font-medium">
                    Category
                  </th>
                  <th className="text-right py-3 pr-4 text-muted-foreground font-medium">
                    Total
                  </th>
                  <th className="text-right py-3 text-muted-foreground font-medium">
                    Monthly
                  </th>
                </tr>
              </thead>
              <tbody>
                {useOfFunds.map((f, index) => (
                  <tr
                    key={f.category}
                    className={`border-b border-border/50 ${
                      index == 0
                        ? "bg-emerald-500/5 -mx-2 px-2 border-l-2 border-l-emerald-400"
                        : ""
                    }`}
                  >
                    <td className="py-3 pr-4 pl-2">{f.category}</td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {f.total}
                    </td>
                    <td className="py-3 pr-2 text-right font-mono text-muted-foreground">
                      {f.monthly}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between max-w-6xl w-full gap-4 border-t border-border pt-4 pb-6">
            <div className="text-xs text-muted-foreground">
              Total:{" "}
              <span
                className="text-lg font-bold text-emerald-400"
                style={{ fontFamily: "var(--font-secondary)" }}
              >
                $176,000
              </span>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <div className="border border-border bg-muted/10 px-3 py-1.5 text-center">
                <div className="uppercase tracking-wider text-muted-foreground">
                  Monthly Burn
                </div>
                <div className="text-xs font-bold text-foreground">
                  ~$16K/mo
                </div>
              </div>
              <div className="border border-border bg-muted/10 px-3 py-1.5 text-center">
                <div className="uppercase tracking-wider text-muted-foreground">
                  Runway
                </div>
                <div className="text-xs font-bold text-foreground">
                  6 months
                </div>
              </div>
            </div>
          </div>
          <div className="border-l-3 border-primary/60 pl-4">
            <p className="text-sm text-muted-foreground">
              The $50K security audit is the single gate between today's product
              and enterprise adoption. With it, integrations move from
              "interesting" to "production-ready."
            </p>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Revenue Path ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Revenue
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Revenue </span>
              <span className="gradient-text">Path</span>
            </h2>
          </div>
          <div className="border border-border/50 bg-muted/10 p-6 mb-4">
            <SlideCTA />
          </div>
          <div className="grid md:grid-cols-2 gap-12 mb-10">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Today</h3>
                <p className="text-muted-foreground text-sm">
                  Small-revenue. Protocol is live, 10k USDC in total volume.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Revenue Mechanics</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Every on-chain payment: 1% protocol fee, auto-deposited to
                    treasury
                  </li>
                  <li className="flex items-start gap-2">
                    <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Fee split: protocol treasury + gateway operator
                    (configurable)
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    No custodial risk, no working capital needed
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2">Path to First Dollars</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Each merchant integration = recurring payment volume</li>
                  <li>
                    1 SaaS business charging 100 users $10/month = $10K/month
                    volume = $100/month to treasury
                  </li>
                  <li>10 such businesses = $1K/month</li>
                  <li className="text-foreground font-medium">
                    This is the floor, not the ceiling — and it compounds with
                    every integration
                  </li>
                </ul>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="font-bold">
                Revenue Scenarios (12 months post-audit)
              </h3>
              <div className="space-y-3">
                {revenueScenarios.map((s) => (
                  <div
                    key={s.label}
                    className="border border-border/50 hover:border-primary/30 transition-all p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{s.label}</span>
                      <span className="font-mono text-sm gradient-text">
                        {s.revenue}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="text-muted-foreground/60">
                          Merchants:
                        </span>{" "}
                        {s.merchants}
                      </div>
                      <div>
                        <span className="text-muted-foreground/60">
                          Volume:
                        </span>{" "}
                        {s.volume}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                The key variable is the merchant count, which is why we focus on{" "}
                <strong className="text-foreground">
                  growth before feature
                </strong>
                . That's what the next 6 months of developer onboarding is
                building toward.
              </p>
            </div>
          </div>

          <div className="border-l-3 border-primary/60 pl-4 mb-6">
            <p className="text-sm text-muted-foreground">
              The opportunity is there, as is the market.
            </p>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Roadmap ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Roadmap
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Next </span>
              <span className="gradient-text">6 Months</span>
            </h2>
          </div>
          <div className="mb-8 border border-border/50 bg-muted/10 p-6">
            <SlideRoadmap />
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="font-bold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-accent" />
                Ongoing: Growth
              </h3>
              <div className="border border-border/50 p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This is the top priority — developer onboarding, merchant
                  acquisition, and ecosystem expansion run in parallel with
                  everything below. Adoption velocity determines everything
                  else.
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-8">
              <h3 className="font-bold flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                Near-Term
              </h3>
              <div className="space-y-4">
                <div className="border border-border/50 p-5">
                  <h4 className="font-semibold text-sm mb-1">Payment Flows</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete all payment models (subscriptions, milestones,
                    pay-as-you-go, one-time, and up-to/cap-based). The up-to
                    model in particular unlocks x402/HTTP 402 alignment and
                    flexible usage billing with caps.
                  </p>
                </div>
                <div className="border border-border/50 p-5">
                  <h4 className="font-semibold text-sm mb-1">
                    DevEx & Self-Hosting
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Docker Compose deployment, integration guides, and
                    self-hostable checkout/API/indexer. A Web2 business can
                    accept stablecoins without knowing what Solana is. Merchants
                    never need to talk to Solana. Tributary made recurring
                    payments easy to use. Accepting stablecoins is as simple as
                    checking a cookie using 5 lines of code, no crypto knowledge
                    required.
                  </p>
                </div>
                <div className="border border-border/50 p-5">
                  <h4 className="font-semibold text-sm mb-1">Contract Audit</h4>
                  <p className="text-sm text-muted-foreground">
                    Engage auditor, complete full security review, resolve all
                    findings. This is the single gate between today's product
                    and enterprise trust.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-8">
              <h3 className="font-bold flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                Mid-Term
              </h3>
              <div className="space-y-4">
                <div className="border border-border/50 p-5">
                  <h4 className="font-semibold text-sm mb-1">
                    Stripe/OpenPay Billing Integration
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Position Tributary as a settlement layer behind
                    Stripe-compatible billing. Merchants keep their existing
                    Stripe integration; Tributary handles the crypto rails
                    underneath.
                  </p>
                </div>
                <div className="border border-border/50 p-5">
                  <h4 className="font-semibold text-sm mb-1">
                    Solana Subscriptions Program
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Work with the Solana Foundation on a dedicated
                    subscription/payment infrastructure program to drive
                    ecosystem adoption.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-8">
              <h3 className="font-bold flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Ongoing / Long-Term
              </h3>
              <div className="border border-border/50 p-5">
                <h4 className="font-semibold text-sm mb-1">Privacy Layer</h4>
                <p className="text-sm text-muted-foreground">
                  Research and integrate privacy-preserving payment policies via
                  Umbra, C-SPL/Arcium, or IKA. Enable merchants and users who
                  need payment confidentiality without sacrificing the
                  non-custodial model.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        {/* ─── Team ─── */}
        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Team
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Solo Builder, </span>
              <span className="gradient-text">Veteran Track Record</span>
            </h2>
          </div>
          <div className="border border-border/50 p-6 mb-6">
            <h3 className="text-xl font-bold mb-3">Fabian Schuh, Dr.-Ing.</h3>
            <p className="text-muted-foreground text-sm mb-6">
              PhD Communications Engineer, 10+ years Web3, 26+ shipped projects.
              Built the entire protocol solo with zero funding.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-[0.12em] mb-2">
                  4+ Successful Exits
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Steemit (founding member)</li>
                  <li>MakerDAO (advisor)</li>
                  <li>Cryptonomex</li>
                  <li>Relay.md</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-[0.12em] mb-2">
                  5+ Operational Solana Projects
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Allowly.app</li>
                  <li>Contribute.so</li>
                  <li>Tributary</li>
                  <li>Chaoscraft, Polycode, repo.trade</li>
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  Rektoff Solana Security Cohort#2 Graduate, SuperteamGermany
                  Member
                </p>
              </div>
            </div>
          </div>
          <div className="border-l-3 border-primary/60 pl-4">
            <p className="text-sm text-foreground font-medium">
              This is a crypto veteran who shipped a complete protocol with $0.
            </p>
          </div>
        </section>

        <div
          className="font-mono text-sm text-muted-foreground/30 select-none"
          aria-hidden="true"
        >
          //
        </div>

        <section className="py-16">
          <div className="mb-8 max-w-3xl space-y-3">
            <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
              Additional Links
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-foreground">Links, </span>
              <span className="gradient-text">Material</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-3">Project</h3>
              <ul className="space-y-2">
                {[
                  { label: "Website", href: "https://tributary.so" },
                  { label: "Docs", href: "https://docs.tributary.so" },
                  { label: "SDK", href: "https://sdk.tributary.so" },
                  { label: "Checkout", href: "https://checkout.tributary.so" },
                  {
                    label: "GitHub",
                    href: "https://github.com/tributary-so",
                  },
                  {
                    label: "Twitter/X",
                    href: "https://x.com/tributaryso",
                  },
                  { label: "Telegram", href: "https://t.me/tributaryso" },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3">Contact</h3>
              <ul className="space-y-2">
                {[
                  { label: "Email", href: "mailto:fabian@tributary.so" },
                  {
                    label: "Telegram",
                    href: "https://t.me/@xeroc",
                  },
                  {
                    label: "X/Twitter",
                    href: "https://x.com/@xer0c",
                  },
                  {
                    label: "LinkedIn",
                    href: "https://linkedin.com/in/fabian-schuh-phd-217b55101/",
                  },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-sm text-primary font-bold uppercase tracking-[0.12em] mb-3">
                Frontier
              </h4>
              <ul className="space-y-2">
                {hackathonLinks.frontier.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-sm text-primary font-bold uppercase tracking-[0.12em] mb-3">
                Cypherpunk
              </h4>
              <ul className="space-y-2">
                {hackathonLinks.cypherpunk.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-16">
          <div className="border border-border bg-muted/20 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              The protocol is built.
              <br />
              <span className="gradient-text">Now we onboard the world.</span>
            </h2>
            <p className="mb-8 text-muted-foreground max-w-xl mx-auto">
              A live, well-built infrastructure product in an important
              category, already proving itself in real use cases, with obvious
              room to grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:fabian@tributary.so"
                className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
              >
                <Users className="h-4 w-4" />
                Get in Touch
              </a>
              <a
                href="https://docs.tributary.so"
                className="border bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
              >
                <Code2 className="h-4 w-4" />
                Read the Docs
              </a>
              <a
                href="https://app.tributary.so"
                className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-4 w-4" />
                Try the App
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
