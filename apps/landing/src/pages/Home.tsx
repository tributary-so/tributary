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
  Lightbulb,
  Palette,
  ShoppingCart,
  HelpCircle,
} from "lucide-react";

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
    icon: Lightbulb,
    title: "SaaS Platforms",
    description: "Monthly/annual software subscriptions",
  },
  {
    icon: Palette,
    title: "Content Creators",
    description: "Fan subscriptions, premium content",
  },
  {
    icon: TrendingUp,
    title: "AI & APIs",
    description: "Token usage, compute billing",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce",
    description: "Product subscriptions, memberships",
  },
];

const stats = [
  { label: "Transaction Finality", value: "400ms" },
  { label: "Protocol Fee", value: "1%" },
  { label: "Payment Types", value: "4" },
  { label: "Production Ready", value: "Yes" },
];

const testimonials = [
  {
    quote:
      "Tributary has revolutionized how we handle subscriptions. The non-custodial approach is a game-changer.",
    author: "Dr.-Ing. Fabian Schuh",
    role: "CTO, Contribute.so",
    image: "testimony/contributeso.png",
  },
  {
    quote:
      "A robust solution for recurring payments on Solana that doesn't compromise on security or user experience.",
    author: "Corinna Abdel-Ibra",
    role: "Founder, Allowly",
    image: "testimony/2.png",
  },
  {
    quote:
      "Engineers integrated Tributary SDK in days. Cash loans tracked on-chain with automatic repayments.",
    author: "Vladislav Lenskii",
    role: "Founder, Yumi Finance",
    image: "testimony/yumi-finance.png",
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
    question: "What payment types are supported?",
    answer:
      "Tributary supports four payment models: Subscriptions for fixed recurring payments, Milestones for project-based phased payments, Pay-as-you-go for usage-based billing with budget controls, and UpTo for one-time claims with policy expiration.",
  },
  {
    question: "What is x402 integration?",
    answer:
      "Tributary powers x402 (HTTP 402 Payment Required) implementation for web micropayments. This enables seamless payment flows over HTTP without breaking the request-response cycle, ideal for API monetization.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="flex flex-col items-start gap-4 text-left">
            <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl">
              Automated Recurring Payments on Solana
            </h1>
            <p className="text-xl text-muted-foreground">
              Web2's payment simplicity, Web3's security. Three payment models
              powered by token delegation—sign once, pay seamlessly.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://docs.tributary.so"
                className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium text-sm outline-none transition-all h-11 px-6"
              >
                <Code2 className="h-4 w-4" />
                Start Building
              </a>
              <a
                href="https://app.tributary.so"
                className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium text-sm outline-none transition-all h-11 px-6"
              >
                Open App
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="font-mono text-sm text-muted-foreground">
                  {stat.label}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="font-mono text-sm text-muted-foreground/30 select-none"
        aria-hidden="true"
      >
        //
      </div>

      <section id="payment-types" className="py-16">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold">Payment Types</h2>
          <p className="text-muted-foreground">
            Four flexible payment models to fit any business model—from
            predictable SaaS subscriptions to usage-based AI APIs.
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
                      <Check className="h-3 w-3 text-accent flex-shrink-0" />
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

      <section id="how-it-works" className="py-16">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <p className="text-muted-foreground">
            Leveraging Solana's native token delegation for seamless, secure
            payments.
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
              wallet.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium">2. Protocol Executes</h3>
            <p className="text-sm text-muted-foreground">
              Permissionless contract processes payments automatically when due.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/20">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-medium">3. Funds Flow</h3>
            <p className="text-sm text-muted-foreground">
              Direct transfer to recipient, no escrow, full transparency.
            </p>
          </div>
        </div>
        <div className="mt-12 border border-border bg-muted/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Terminal className="h-10 w-10 text-primary flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-bold">Simple Integration</h3>
              <p className="text-sm text-muted-foreground">
                Drop pre-built React components into your app. Accept
                subscription payments immediately with just a few lines of code.
              </p>
            </div>
            <a
              href="https://docs.tributary.so/sdk-react"
              className="border bg-background hover:bg-muted/50 inline-flex items-center gap-2 px-4 py-2 text-sm transition-all"
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

      <section id="use-cases" className="py-16">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold">Built For</h2>
          <p className="text-muted-foreground">
            Perfect for any recurring revenue model on Solana.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-4 space-y-3">
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

      <section id="testimonials" className="py-16">
        <div className="mb-8 max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold">What Developers Say</h2>
          <p className="text-muted-foreground">
            Trusted by innovative projects building on Solana.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="p-5 space-y-4">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-yellow-500"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.21 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <img
                    src={testimonial.image}
                    alt={testimonial.author}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
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

      <section id="faq" className="py-16">
        <div className="mb-8 max-w-2xl space-y-3">
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
                  <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
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

      <section id="cta" className="py-16">
        <div className="border border-border bg-muted/20 p-12 text-center">
          <h2 className="mb-4 text-2xl font-bold">Ready to Build?</h2>
          <p className="mb-8 text-muted-foreground">
            Start accepting recurring payments on Solana in minutes. Complete
            SDK, React components, and comprehensive documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://docs.tributary.so"
              className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium text-sm outline-none transition-all h-11 px-6"
            >
              <Code2 className="h-4 w-4" />
              Get Started
            </a>
            <a
              href="https://app.tributary.so"
              className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium text-sm outline-none transition-all h-11 px-6"
            >
              Try Demo
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
