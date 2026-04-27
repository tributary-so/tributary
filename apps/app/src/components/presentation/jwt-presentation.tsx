import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import QRCodeGenerator from '../qrcode'

const slides = [
  {
    title: 'TRIBUTARY',
    subtitle: 'Recurring payments on Solana — for humans, businesses, and AI agents.',
    imageUrl: '/code-review.svg',
    badges: [
      { text: 'SOLANA PAYMENTS INFRASTRUCTURE', variant: 'primary' as const },
      { text: 'LIVE ON MAINNET', variant: 'accent' as const },
      { text: 'FRONTIER HACKATHON', variant: 'outline' as const },
    ],
    footer: 'Accept subscriptions. Verify with JWT. Zero Solana knowledge required.',
  },
  {
    title: 'THE PROBLEM',
    subtitle: "Web2 runs on subscriptions. On Solana, they didn't exist.",
    imageUrl: '/presentation.svg',
    points: [
      'SaaS, creator support, API billing — the entire digital economy runs on recurring payments',
      'Existing "solutions" send monthly emails reminding users to sign — that is not a subscription',
      'Every week without native recurring payments = revenue left on the table',
    ],
    footer: 'The #1 request from businesses evaluating Solana payments',
  },
  {
    title: 'THE FLOW',
    subtitle: 'Send user to checkout. Get back a verified JWT. Done.',
    imageUrl: '/dev-env.svg',
    architecture: [
      {
        step: '1',
        title: 'Checkout Link',
        desc: 'Merchant generates a payment link. User signs once. No wallet integration on merchant side.',
      },
      {
        step: '2',
        title: 'JWT Issued',
        desc: 'Tributary mints a signed JWT with subscription data and payment history. ES256, auto-rotating keys.',
      },
      {
        step: '3',
        title: 'Verify & Done',
        desc: 'Merchant verifies the JWT via public JWKS endpoint. One React hook. Zero backend required.',
      },
    ],
    footer: 'A web2 merchant can accept USDC subscriptions without knowing what Solana is.',
  },
  {
    title: 'DEVELOPER EXPERIENCE',
    subtitle: 'Two React hooks. Three lines of code. Full payment integration.',
    imageUrl: '/dev-env.svg',
    codeExamples: [
      {
        label: 'useCheckoutSession — Generate payment link',
        code: 'const { initiate } = useCheckoutSession(baseUrl);\ninitiate({ mode: "subscription",\n  amount: 10, paymentFrequency: "monthly" });',
      },
      {
        label: 'useTributaryToken — Verify on return',
        code: 'const { payload, loading } = useTributaryToken();\n// payload.status === "paid"\n// payload.subscriptions[], .trackingId',
      },
    ],
    points: [
      'npm install @tributary-so/sdk-react — no web3.js, no wallet adapter, no RPC provider',
      'Hosted checkout at checkout.tributary.so — generate payment links in seconds, no code',
      'JWT verification works in static React pages — GitHub Pages, Vercel, anywhere',
    ],
    footer: 'The entire payment flow without importing a single blockchain library.',
  },
  {
    title: 'FOUR PAYMENT MODELS',
    subtitle: 'One delegation, unlimited policies. Extending the Solana Token Program.',
    imageUrl: '/visual-data.svg',
    grid: [
      {
        category: 'ONE TIME',
        examples: 'Fixed amount, fixed recevier, paid once. No fuzz.',
      },
      {
        category: 'SUBSCRIPTION',
        examples:
          'Fixed amount, fixed frequency. Monthly, weekly, custom intervals. Auto-renew optional. Cancel anytime.',
      },
      {
        category: 'MILESTONE',
        examples: 'Up to 4 deliverable phases with time-based or manual release. Escrow-style. Perfect for freelance.',
      },
      {
        category: 'PAY-AS-YOU-GO',
        examples: 'Usage-based billing with period limits and chunk caps. Ideal for APIs, agents, metered services.',
      },
    ],
    footer: 'One program. Three models. Unlimited policies per user. Privacy variants in development.',
  },
  {
    title: 'BUILT FOR PROVIDERS',
    subtitle: 'Tributary is the credit card network. You can be Stripe.',
    imageUrl: '/code-review.svg',
    comparison: {
      headers: ['Layer', 'Web2 Analogy', 'Tributary'],
      rows: [
        ['Payment Rail', 'Visa / Mastercard', 'On-chain protocol'],
        ['Processor', 'Stripe, Adyen, PayPal', 'Your registered gateway'],
        ['Checkout', 'Stripe Checkout', 'Hosted checkout page'],
        ['Verification', 'Webhook signature', 'JWT + JWKS'],
      ],
    },
    points: [
      'Register as a gateway — configurable fees, authority, signer keys',
      'Execute payments on behalf of your users. Build your own payment product on top.',
      '1% protocol fee + your configurable gateway fee',
    ],
  },
  {
    title: 'SECURITY BY DESIGN',
    subtitle: 'Non-custodial. Verified builds. Zero TVL by architecture.',
    imageUrl: '/code-review.svg',
    points: [
      "Funds never leave the user's wallet until payment executes — TVL is always $0",
      'Token delegation: user can cancel anytime, instant effect, full control',
      'Every instruction validates signer authority, policy scope, and payment timing',
      'Verified builds by Ottersec. Rektoff Security Cohort #2 Graduate.',
    ],
    stats: {
      label: 'Trust Anchors',
      items: [
        { value: '$0', label: 'TVL (by design)' },
        { value: '0', label: 'Custodied Funds' },
        { value: 'Ottersec', label: 'Verified Build' },
      ],
    },
    footer: 'Program ID: TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ',
  },
  {
    title: 'PAYMENT ACCURACY',
    subtitle: 'Recurring payments are harder than they look. We handled the edge cases.',
    imageUrl: '/dev-env.svg',
    comparison: {
      headers: ['Challenge', 'How We Solve It'],
      rows: [
        ['Monthly billing across leap years', 'Calendar-aware scheduling with edge case coverage'],
        ['Clock drift between validators', 'Conservative timing with automatic retry logic'],
        ['Failed transaction recovery', 'Idempotent execution with state verification'],
        ['Multiple policy types, one account', 'Fixed-size accounts with variant padding'],
        ['Merchant verification without PDAs', 'JWT checkout — sign once, verify anywhere'],
      ],
    },
    footer: 'These are the problems nobody thinks about until they break production.',
  },
  {
    title: 'SELF-HOSTABLE',
    subtitle: 'Your infra. Your rules. One repo.',
    imageUrl: '/dev-env.svg',
    points: [
      'Complete stack in one GitHub repo: checkout, API, indexer, JWKS signing',
      'Custom blockchain indexer — IDL-based, zero custom dependencies',
      'Supports SQLite, Postgres, MongoDB, and Kafka — pick your backend',
      'Docker Compose deployment — full payment infrastructure in minutes',
      'No external dependencies beyond a Solana RPC node',
    ],
    stats: {
      label: 'Full Stack',
      items: [
        { value: '1', label: 'GitHub Repo' },
        { value: '4+', label: 'DB Backends' },
        { value: 'Docker', label: 'Deployment' },
      ],
    },
    footer: 'Open source. Fork it. Self-host it. Own your payment infrastructure.',
  },
  {
    title: 'TRACTION',
    subtitle: 'Zero marketing. Zero outreach. Demand found us.',
    imageUrl: '/growth.svg',
    metrics: [
      { value: '10+', label: 'Products Built' },
      { value: '$0', label: 'Marketing Spent' },
      { value: '$0', label: 'Raised' },
    ],
    points: [
      'yumi.finance — loan repayments via Tributary. Found us, evaluated, integrated. Zero sales effort.',
      'Allowly.app — pocket money for kids and AI agents, built to prove the integration model',
      'contribute.so — Patreon for creators, but using USDC on Solana',
      'Inbound demand from RPC providers, API products, LLM services',
    ],
    footer: 'For infrastructure, organic pull is the strongest leading indicator.',
  },
  {
    title: 'THE FOUNDER',
    subtitle: 'A web3 veteran who built a complete protocol solo.',
    imageUrl: '/proud.svg',
    points: [
      'Dr.-Ing. Fabian Schuh — PhD Communications Engineer, 10+ years Web3',
      'BitShares (committee), Steemit (founding member), MakerDAO (advisor)',
      '5+ Solana projects: Tributary, Allowly, Contribute.so, Chaoscraft, Polycode',
      'Rektoff Solana Security Cohort #2 Graduate. Superteam Germany.',
      'Full-time crypto developer since 2015. Entire protocol built solo.',
    ],
    footer: 'Live on mainnet. Open source. Ready to scale.',
  },
  {
    title: 'GET STARTED',
    subtitle: 'Live. Open source. Ready for your integration.',
    imageUrl: '/proud.svg',
    points: [
      'Hosted Checkout — checkout.tributary.so (no code required)',
      'React SDK — npm install @tributary-so/sdk-react',
      'x402 Middleware — npm install @tributary-so/sdk-x402',
      'Docs — docs.tributary.so',
      'GitHub — github.com/tributary-so (everything open source)',
    ],
    cta: 'tributary.so',
    footer: 'Stripe made internet payments invisible. We do the same for Solana.',
    qrCodes: [{ url: 'https://tributary.so', title: '' }],
  },
]

const variants = {
  enter: { x: 200, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -200, opacity: 0 },
}

export default function JwtPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide()
    if (e.key === 'ArrowLeft') prevSlide()
  }

  const renderSlide = (slide: (typeof slides)[0]) => (
    <div className="flex flex-col items-center justify-start h-full w-full px-4 sm:px-8 md:px-12 py-4 overflow-hidden">
      <div className="w-full max-w-5xl">
        {slide.imageUrl && (
          <motion.img
            src={slide.imageUrl}
            alt={slide.title}
            className="h-16 sm:h-20 object-contain mb-4"
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
        <motion.div
          className="uppercase tracking-wide mb-2 text-2xl sm:text-3xl md:text-4xl font-bold text-primary"
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {slide.title}
        </motion.div>

        {slide.subtitle && (
          <motion.div
            className="text-sm sm:text-base md:text-lg mb-4"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-muted-foreground font-semibold">{slide.subtitle}</span>
          </motion.div>
        )}

        {slide.badges && (
          <motion.div
            className="flex flex-wrap gap-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {slide.badges.map((badge, i) => (
              <span
                key={i}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
                  badge.variant === 'primary'
                    ? 'bg-primary/10 text-primary'
                    : badge.variant === 'accent'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'border border-border text-muted-foreground'
                }`}
              >
                {badge.text}
              </span>
            ))}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }}>
          {slide.points && (
            <div className="space-y-2">
              {slide.points.map((point, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3 text-sm sm:text-base"
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.2 + index * 0.08 }}
                >
                  <div className="shrink-0 w-1.5 h-1.5 bg-primary mt-2" />
                  <div className="text-foreground leading-snug">{point}</div>
                </motion.div>
              ))}
            </div>
          )}

          {slide.comparison && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    {slide.comparison.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border border-primary px-2 sm:px-3 py-2 text-left text-xs sm:text-sm uppercase font-semibold text-primary"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slide.comparison.rows.map((row, i) => (
                    <tr key={i} className="bg-muted/50">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`border border-primary px-2 sm:px-3 py-2 text-xs sm:text-sm ${
                            j === row.length - 1 && cell === '\u2713'
                              ? 'text-emerald-500 font-bold'
                              : j === row.length - 1
                              ? 'text-foreground'
                              : cell === '\u2713'
                              ? 'text-emerald-500 font-bold'
                              : cell === '\u2717'
                              ? 'text-muted-foreground'
                              : 'text-muted-foreground'
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
          )}

          {slide.stats && (
            <div className="mt-4">
              <div className="text-xs sm:text-sm uppercase mb-2 text-muted-foreground">{slide.stats.label}</div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {slide.stats.items.map((item, i) => (
                  <div key={i} className="border border-primary p-2 sm:p-3 text-center bg-muted/50">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold mb-1 text-primary">{item.value}</div>
                    <div className="text-xs uppercase text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.architecture && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
              {slide.architecture.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 flex items-center justify-center text-primary-foreground text-base sm:text-xl bg-primary border-2 border-primary">
                    {item.step}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold mb-1 text-primary">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {slide.grid && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              {slide.grid.map((item, i) => (
                <div key={i} className="border border-primary p-3 bg-muted/50">
                  <div className="text-xs sm:text-sm uppercase font-bold mb-1 text-primary">{item.category}</div>
                  <div className="text-xs text-muted-foreground">{item.examples}</div>
                </div>
              ))}
            </div>
          )}

          {slide.codeExamples && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {slide.codeExamples.map((example, i) => (
                <div key={i} className="border border-primary bg-muted/50 p-3">
                  <div className="text-xs uppercase font-bold mb-2 text-primary">{example.label}</div>
                  <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}

          {slide.metrics && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-3">
                {slide.metrics.map((metric, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 border-2 border-primary p-3 sm:p-4 bg-muted/50 text-primary">
                      {metric.value}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold uppercase text-muted-foreground mt-1">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {(slide.cta || slide.footer) && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {slide.cta && (
              <div className="text-sm sm:text-base md:text-lg uppercase tracking-wide mb-2 text-primary font-bold">
                &rarr; {slide.cta}
              </div>
            )}
            {slide.footer && <div className="text-xs italic text-muted-foreground/60">{slide.footer}</div>}
          </motion.div>
        )}

        {slide.qrCodes && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="flex justify-center">
              {slide.qrCodes.map((item, i) => (
                <div key={i}>
                  <QRCodeGenerator url={item.url} text={item.title} size="180px" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )

  return (
    <div
      className="w-full h-full flex items-center justify-center relative min-h-[75vh] max-h-[85vh]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <button
        onClick={prevSlide}
        className="absolute top-8 right-11 sm:right-15 z-10 p-2 border border-primary hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute top-8 right-2 z-10 p-2 border border-primary hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            {renderSlide(slides[currentSlide])}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className="w-2.5 h-2.5 transition-all border border-primary"
            style={{
              backgroundColor: index === currentSlide ? 'hsl(var(--primary))' : 'transparent',
            }}
          />
        ))}
      </div>

      <div className="absolute top-4 right-2 sm:right-6 text-xs uppercase tracking-wide text-muted-foreground">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  )
}
