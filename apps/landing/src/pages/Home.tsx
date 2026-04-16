import {
  RefreshCw,
  Target,
  TrendingUp,
  CreditCard,
  Code2,
  Lock,
  Zap,
  Shield,
  ChevronDown,
  Check,
  Terminal,
  ArrowRight,
  ShoppingCart,
  HelpCircle,
  ExternalLink,
  Rocket,
  Brain,
  Package,
  Globe,
  DollarSign,
  Layers,
  Users,
  ArrowRightLeft,
  Wallet,
  KeyRound,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  {
    name: "UpTo",
    icon: CreditCard,
    description: "One-time claim, expiring policy",
    features: [
      "Single claim window",
      "Policy expiration",
      "x402 compliant",
      "Pre-approved budget",
    ],
    tags: ["API", "x402", "Micropayments"],
    color: "orange-500",
  },
];

const integrations = [
  {
    name: "Yumi Finance",
    description: "Cash loans with automatic repayments on Solana.",
    founder: "Vladislav Lenskii",
    link: "https://yumifinance.io",
    image: "testimony/yumi-finance.png",
  },
  {
    name: "Allowly",
    description: "Subscription-oriented recurring payment use case.",
    founder: "Dr.-Ing. Fabian Schuh",
    link: "https://contribute.so",
    image: "testimony/contributeso.png",
  },
  {
    name: "Contribute.so",
    description: "Recurring crypto donations for GitHub developers.",
    founder: "Dr.-Ing. Fabian Schuh",
    link: "https://contribute.so",
    image: "testimony/contributeso.png",
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

const differentiators = [
  "Live on mainnet since October 2025",
  "Recurring payments built as infrastructure, not a one-off feature",
  "Multiple payment models already supported",
  "Strong developer surface: app, docs, SDK, checkout",
  "Works across several use-case categories",
  "Built by a serious protocol founder with real shipping history",
];

const roadmap = [
  {
    phase: "Now",
    icon: Rocket,
    items: [
      "Expand live integrations",
      "Improve developer onboarding",
      "Make docs and SDK easier to implement",
    ],
  },
  {
    phase: "Next",
    icon: ArrowRight,
    items: [
      "Stronger commerce flows",
      "Better recurring billing UX",
      "More reusable payment templates for common product types",
    ],
  },
  {
    phase: "Ahead",
    icon: Globe,
    items: [
      "Deeper AI payment support",
      "More flexible payment logic",
      "Broader ecosystem integrations",
    ],
  },
];

const faqs = [
  {
    question: "What is Tributary?",
    answer:
      "Tributary is a Solana-native protocol enabling automated, non-custodial recurring payments through token delegation. It supports four payment models: Subscriptions, Milestones, Pay-as-you-go, and UpTo.",
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
    question: "What is x402 integration?",
    answer:
      "Tributary powers x402 (HTTP 402 Payment Required) implementation for web micropayments. This enables seamless payment flows over HTTP without breaking the request-response cycle, ideal for API monetization.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    navigate("/");
    sessionStorage.setItem("scrollTo", id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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
    <main className="mx-auto max-w-5xl px-4">
      {/* ─── 1. Hero ─── */}
      <section className="py-20">
        <div className="flex flex-col gap-6 text-center lg:text-left lg:items-start">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 px-3 py-1.5 text-accent text-xs font-mono">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Live on Solana mainnet since October 2025
          </div>
          <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl lg:text-5xl">
            Recurring Payment Infrastructure for Solana
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto lg:mx-0">
            Already powering real product flows. Tributary helps developers and
            businesses add subscriptions, milestone payments, pay-as-you-go
            billing, and commerce checkout{" "}
            <span className="text-foreground">
              without building the payment stack from scratch
            </span>
            .
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row justify-center lg:justify-start">
            <a
              href="https://docs.tributary.so"
              className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              <Code2 className="h-4 w-4" />
              View Docs
            </a>
            <a
              href="https://app.tributary.so"
              className="border bg-background shadow-2xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              Open App
            </a>
            <a
              onClick={() => scrollToSection("use-cases")}
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              Explore Use Cases
            </a>
          </div>
        </div>
      </section>

      {/* ─── 3. What Tributary Is ─── */}
      <section id="what-is-tributary" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">What Tributary Is</h2>
          <p className="text-muted-foreground">
            Recurring payment infrastructure for Solana. Not a single payment
            feature —{" "}
            <span className="text-foreground">
              infrastructure for products that need money to move repeatedly,
              predictably, and on-chain
            </span>
            .
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

      {/* ─── 4. Why This Matters Now ─── */}
      <section id="why-it-matters" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">
            Why Recurring Payments Matter on Solana
          </h2>
          <p className="text-muted-foreground">
            Recurring payments are still a missing primitive in crypto products.
          </p>
        </div>
        <div className="border border-border/50 bg-muted/10 p-8 max-w-3xl space-y-4">
          <p className="text-sm text-muted-foreground">
            If a team wants to support subscriptions, repayments, usage-based
            billing, scheduled payouts, or agent-controlled spending, they
            usually have to build custom logic themselves or compromise on
            product quality.
          </p>
          <p className="text-sm text-foreground font-medium">
            Tributary exists to solve that problem as infrastructure. This is an
            important category, not a niche widget.
          </p>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 5. Who Is Using It ─── */}
      <section id="integrations" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">
            Who Is Using Tributary Right Now
          </h2>
          <p className="text-muted-foreground">
            Already being used in real product environments.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {integrations.map((integration) => (
            <a
              key={integration.name}
              href={integration.link}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border/50 hover:border-primary/30 transition-all group block"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={integration.image}
                    alt={integration.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                      {integration.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {integration.founder}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 6. How It Works ─── */}
      <section id="how-it-works" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <p className="text-muted-foreground">
            Solana-native delegation. Users approve payment logic—funds do not
            need to be locked in escrow.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">1. User Approves</h3>
            <p className="text-sm text-muted-foreground">
              Single transaction grants delegate permissions. Funds stay in
              wallet—no clunky locked-funds experience.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">2. Protocol Executes</h3>
            <p className="text-sm text-muted-foreground">
              Permissionless contract processes payments automatically when due.
              Developers don't build custom rails from scratch.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-medium">3. Funds Flow</h3>
            <p className="text-sm text-muted-foreground">
              Direct transfer to recipient, no escrow, full transparency.
              Businesses get a native recurring payment system.
            </p>
          </div>
        </div>
        <div className="mt-12 border border-border bg-muted/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Terminal className="h-10 w-10 text-primary shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-bold">Simple Integration</h3>
              <p className="text-sm text-muted-foreground">
                Drop pre-built React components into your app. Accept
                subscription payments immediately with just a few lines of code.
              </p>
            </div>
            <a
              href="https://docs.tributary.so/sdk-react"
              className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all shrink-0"
            >
              View SDK Docs <ArrowRight className="h-3 w-3" />
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

      {/* ─── 7. Use Cases ─── */}
      <section id="use-cases" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">
            Real Use Cases for Tributary
          </h2>
          <p className="text-muted-foreground">
            Usable today across multiple important categories. That is part of
            what gives it upside.
          </p>
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
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 8. JWT Checkout Experience ─── */}
      <section id="checkout" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">
            Accept Crypto as Easily as Checking a Cookie
          </h2>
          <p className="text-muted-foreground">
            No Solana SDK. No RPC calls. No account deserialization. Just a JWT
            check—the same thing you've done with session cookies and auth
            tokens.
          </p>
        </div>

        <div className="border border-border/50 bg-muted/10 p-6 mb-6">
          <div className="grid gap-0 md:grid-cols-4">
            <div className="flex flex-col items-center text-center p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center border border-primary/40 bg-primary/10 text-primary font-bold text-sm">
                1
              </div>
              <h3 className="font-medium text-sm">Derive Checkout Link</h3>
              <p className="text-xs text-muted-foreground">
                Your server builds a checkout URL from invoice data (amount,
                recipient, plan details).
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center border border-primary/40 bg-primary/10 text-primary font-bold text-sm">
                2
              </div>
              <h3 className="font-medium text-sm">Redirect User</h3>
              <p className="text-xs text-muted-foreground">
                URL contains base64-encoded checkout payload. User lands on
                checkout.tributary.so.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center border border-accent/40 bg-accent/10 text-accent font-bold text-sm">
                3
              </div>
              <h3 className="font-medium text-sm">Customer Pays</h3>
              <p className="text-xs text-muted-foreground">
                Wallet connect, sign, and pay. Tributary handles the full Solana
                transaction flow.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-5 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center border border-accent/40 bg-accent/10 text-accent font-bold text-sm">
                4
              </div>
              <h3 className="font-medium text-sm">JWT Confirmation</h3>
              <p className="text-xs text-muted-foreground">
                On-chain payment confirmed. User redirected to your successPage
                with a signed JWT proving payment and subscription setup.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-border/50 p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">Hosted Checkout</h3>
            <p className="text-sm text-muted-foreground">
              Wallet connection, signing, and execution all handled on
              checkout.tributary.so. No Solana code on your end.
            </p>
          </div>
          <div className="border border-border/50 p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-medium">JWT Proof</h3>
            <p className="text-sm text-muted-foreground">
              Verify the JWT with any standard library. Subscription status,
              payment amounts—cryptographically signed, on-chain verifiable.
            </p>
          </div>
          <div className="border border-border/50 p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">Self-Hostable</h3>
            <p className="text-sm text-muted-foreground">
              Checkout, API, indexer, signing keys—all open source and
              self-hostable. Start hosted, migrate when ready.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="https://checkout.tributary.so"
            target="_blank"
            rel="noopener noreferrer"
            className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all"
          >
            <Wallet className="h-4 w-4" />
            Try Checkout
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://docs.tributary.so/jwt-auth/"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-border/50 bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all text-muted-foreground hover:text-foreground"
          >
            Read JWT Flow Docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 9. Why Tributary Is Different ─── */}
      <section id="why-different" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Why Tributary Is Different</h2>
          <p className="text-muted-foreground">
            Most teams don't want to build recurring payment logic themselves.
            Most users don't want awkward payment experiences.
          </p>
        </div>
        <div className="border border-border/50 bg-muted/10 p-8">
          <p className="text-sm font-medium mb-6">
            Tributary gives teams a reusable recurring payment layer built for
            Solana.
          </p>
          <ul className="space-y-3">
            {differentiators.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 11. Product Roadmap ─── */}
      <section id="roadmap" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">What's Next</h2>
          <p className="text-muted-foreground">
            Already live, with a clear, believable next layer of product growth.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roadmap.map((phase) => (
            <div
              key={phase.phase}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <phase.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">{phase.phase}</h3>
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                      {item}
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

      {/* ─── 12. Developer Proof ─── */}
      <section id="developers" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Built for Developers</h2>
          <p className="text-muted-foreground">
            A product people can actually try, not just read about.
          </p>
        </div>
        <div className="border border-border bg-neutral-900 text-neutral-100 p-6 mb-6">
          {/*
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-neutral-400 font-medium">
              Terminal
            </span>
            <span className="text-xs text-neutral-500">
              npm / yarn / pnpm / bun
            </span>
          </div>
            */}
          <div className="font-mono text-sm">
            <span className="text-green-400">$ </span>
            <span className="text-white">npm install @tributary-so/sdk</span>
          </div>
          <div className="font-mono text-sm mt-2">
            <span className="text-green-400">$ </span>
            <span className="text-white">
              npm install @tributary-so/sdk-react
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Docs", href: "https://docs.tributary.so", icon: Code2 },
            { label: "App", href: "https://app.tributary.so", icon: Layers },
            {
              label: "Checkout",
              href: "https://checkout.tributary.so",
              icon: ShoppingCart,
            },
            {
              label: "npm",
              href: "https://npmjs.com/package/@tributary-so/sdk",
              icon: Package,
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
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ─── 13. FAQ ─── */}
      <section id="faq" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">
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
            Live, Usable, and Open for Builders
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
              href="mailto:team@tributary.so"
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              Contact / Integrate
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
