//import { Link } from "react-router-dom";
import {
  RefreshCw,
  Target,
  TrendingUp,
  CreditCard,
  Code2,
  ChevronDown,
  Check,
  Terminal,
  ArrowRight,
  ShoppingCart,
  HelpCircle,
  //ExternalLink,
  Brain,
  DollarSign,
  Users,
  //ArrowRightLeft,
  //Wallet,
  BriefcaseBusiness,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TerminalCard from "../components/TerminalCard";
import TwitterWall from "@/components/TwitterWall";
import HowToRecurring from "@/components/HowToRecurring";
import IntegrationsWall from "@/components/IntegrationsWall";
import Mentions from "@/components/Mentions";
import HowToProcessor from "@/components/HowToProcessor";
import FutardioBanner from "@/components/futardio-banner";

const checklistItems = [
  {
    title: "No Solana SDK needed",
    desc: "Your codebase never imports web3.js, wallet adapter, or RPC providers.",
  },
  {
    title: "Cryptographic proof",
    desc: "JWT signed with ES256, verifiable against public JWKS endpoint.",
  },
  {
    title: "Smart expiration",
    desc: "Tokens expire with the payment cycle. Refreshes pull fresh on-chain state.",
  },
  {
    title: "Self-hostable when ready",
    desc: "Migrate checkout, API, and indexer to your own infrastructure whenever you want.",
  },
];

const fnList = [
  {
    fn: "Register",
    desc: "Register as a gateway with custom fees and signer keys",
  },
  {
    fn: "Process",
    desc: "Execute recurring payments via permissionless on-chain contract",
  },
  {
    fn: "Verify",
    desc: "JWT + JWKS verification, confirm subscription details",
  },
  {
    fn: "Earn",
    desc: "Set your own gateway fee on top of the 1% protocol fee",
  },
];

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
    question: "How can I get my business ready?",
    answer:
      "Head over to the onboarding link in the developers drop down in the navigation and complete the form!",
  },
  {
    question: "What is x402 integration?",
    answer:
      "Tributary powers x402 (HTTP 402 Payment Required) implementation for web micropayments. This enables seamless payment flows over HTTP without breaking the request-response cycle, ideal for API monetization.",
  },
];

export default function HomeFutardio() {
  return (
    <>
      <FutardioBanner />
      <HomeContent />
    </>
  );
}

export function HomeContent() {
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
    <main className="mx-auto max-w-6xl px-4">
      {/* ─── Hero ─── */}
      <section id="hero" className="py-20">
        <div className="flex flex-col gap-6 text-center lg:text-left lg:items-start">
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 px-3 py-1.5 text-accent text-xs font-mono">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Live on Solana mainnet
          </div>
          <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl lg:text-5xl">
            <span className="text-foreground">The payment protocol</span>
            <br />
            <span className="gradient-text">for Solana.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto lg:mx-0">
            We&apos;re the only payment infrastructure with truly automated
            recurring payments on Solana.{" "}
            <span className="text-foreground">
              Sign Once. Pay Automatically. Verify Anywhere
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
              onClick={() => scrollToSection("use-cases")}
              className="border border-border/50 bg-background hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6 text-muted-foreground hover:text-foreground"
            >
              Explore Use Cases
            </a>
            <a
              href="https://tally.so/r/RGbbGl"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent/60 hover:bg-accent/80 text-white shadow-2xs inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              Business Onboarding <ArrowRight className="h-3 w-3" />
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

      {/* ─── Payment Models ─── */}
      <section id="payment-models" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Payment Models
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">One delegation, </span>
            <span className="gradient-text">four models.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            A single token delegation powers subscriptions, milestones,
            pay-as-you-go billing, and one-time payments. Unlimited policies per
            user. More models to be implemented in the future. Extending the
            Solana Token Program, not replacing it.
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

      {/* ── Sidebar Feature Section ── */}
      <section id="developers" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Developer Experience
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">
              A payment platform built for{" "}
            </span>
            <span className="gradient-text">developers.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Accept USDC without touching a single blockchain library. Self-host
            everything. Or don&apos;t. Our hosted path has you covered.
          </p>
        </div>
        <HowToRecurring />
        <div className="mt-12 border border-border bg-muted/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Terminal className="h-10 w-10 text-primary shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-bold">Full Integration Example</h3>
              <p className="text-sm text-muted-foreground">
                Full react integration examples using React Hooks or predefined
                React Buttons.
              </p>
            </div>
            <a
              href="https://github.com/tributary-so/tributary/tree/develop/apps/example-payments"
              className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all shrink-0"
            >
              View Examples <ArrowRight className="h-3 w-3" />
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

      {/* ── Editorial A: JWT Flow ── */}
      <section id="jwt-checkout" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Checkout
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">
              Accepting crypto should be
              <br />
              as easy as{" "}
            </span>
            <span className="gradient-text">checking a cookie.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Your website never talks to Solana. Your code never touches a
            keypair, an RPC endpoint, or an on-chain account. You receive a
            signed JWT, verify it, and know cryptographically that a payment
            happened.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-16 md:gap-20 items-center">
          <div className="space-y-8">
            <ul className="space-y-5">
              {checklistItems.map(({ title, desc }) => (
                <li key={title} className="flex items-start gap-4">
                  <div className="w-5 h-5 border border-primary/40 bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold mb-0.5">
                      {title}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <a
              href="https://docs.tributary.so/jwt-auth/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary font-medium group"
            >
              <span>Read JWT Flow Docs</span>
              <span className="transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </a>
          </div>
          <TerminalCard
            filename="verify.ts"
            language="typescript"
            code={`import { jwtVerify, createRemoteJWKSet } from "jose";

const { payload } = await jwtVerify(
  token,
  createRemoteJWKSet(
    new URL("https://api.tributary.so/.well-known/jwks.json")
  ),
  {
    issuer: "https://api.tributary.so",
    audience: "tributary-checkout"
  }
);

// Subscription active?
if (payload.subscriptions.length > 0) {
  const sub = payload.subscriptions[0];
  // sub.status === "paid"
  // sub.amount === "10.00"
  // sub.paymentFrequency === "monthly"
}

// One-time payment?
if (payload.lastPayments.length > 0) {
  const payment = payload.lastPayments[0];
  // Cryptographic proof of transfer
}`}
          />
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      {/* ── Editorial B: We're the Rails ── */}
      <section id="infrastructure" className="py-16">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs text-primary font-bold uppercase tracking-[0.15em]">
            Infrastructure
          </p>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-foreground">We&apos;re the rails. </span>
            <span className="gradient-text">You&apos;re payments.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            Tributary is the credit card network. You register as a gateway and
            become a payment processor. Protocol fees compound with every
            integration. More gateways = more volume = more valuable protocol.
          </p>
        </div>
        <div className="tems-center">
          <div className="space-y-8 order-1 md:order-2">
            <ul className="space-y-8">
              {fnList.map(({ fn, desc }) => (
                <li key={fn}>
                  <div className="border-l-3 border-purple-800 pl-4">
                    <h3 className="text-lg font-semibold font-mono text-purple-600 mb-1 tracking-widest">
                      {fn}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border border-border bg-muted/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <BriefcaseBusiness className="h-10 w-10 text-primary shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-bold">Build your Tributary Business</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1% protocol fee + your gateway fee.</li>
                <li>Non-custodial. $0 TVL risk.</li>
                <li>Open source. Fork it. Own it.</li>
              </ul>
            </div>
            <a
              href="https://tally.so/r/RGbbGl"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-hidden transition-all h-11 px-6"
            >
              Onboarding Form <ArrowRight className="h-3 w-3" />
            </a>
            <a
              href="https://docs.tributary.so"
              className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all shrink-0"
            >
              Read the docs <ArrowRight className="h-3 w-3" />
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
