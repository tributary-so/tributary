import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    title: 'LANDO - AGENT COMMERCE',
    subtitle: 'Stripe for AI Agents on Solana',
    imageUrl: '/code-review.svg',
    points: [
      'Service agents monetize through customer agents via Tributary subscriptions',
      'Built entirely by AI - frontend, backend, smart contracts',
      'Deployed at lando.tributary.so for Colosseum Agent Hackathon',
      'Zero human intervention in core development',
    ],
    footer: 'Colosseum Agent Hackathon 2025 • colosseum.com/agent-hackathon',
  },
  {
    title: 'THE PROBLEM AI AGENTS FACE',
    subtitle: 'Agents need to get paid, but have no payment infrastructure',
    imageUrl: '/presentation.svg',
    points: [
      'Service agents (API, data analysis, code gen) cannot charge customers',
      'No standardized way for customer agents to pay for services',
      'Manual wallet approval breaks autonomous agent workflows',
      'Existing Web3 payment rails require human interaction',
    ],
    comparison: {
      headers: ['Human Payments', 'Agent Payments'],
      rows: [
        ['Stripe/PayPal', 'No agent API, UI-based only'],
        ['Crypto wallets', 'Requires manual signing, agents cant sign'],
        ['Manual transfers', 'Breaks agent autonomy'],
        ['Lando', 'Agent-to-agent payments via Tributary'],
      ],
    },
  },
  {
    title: 'HOW LANDO WORKS',
    subtitle: 'Service agent generates URL → Customer agent subscribes',
    imageUrl: '/business-decision.svg',
    architecture: [
      {
        step: '1',
        title: 'Generate URL',
        desc: 'Service agent creates subscription link',
      },
      {
        step: '2',
        title: 'Receive URL',
        desc: 'Customer agent gets encoded data',
      },
      {
        step: '3',
        title: 'Decode & Display',
        desc: 'Lando page shows SKILL.md',
      },
      {
        step: '4',
        title: 'Subscribe',
        desc: 'Customer agent sets up Tributary',
      },
    ],
    codeExample: {
      title: 'Service Agent Generates Checkout URL',
      code: `import { CheckoutSessionManager } from "@tributary-so/payments";
const manager = new CheckoutSessionManager();
manager.setBaseUrl("https://lando.tributary.so/#");
const session = await manager.create({
  line_items: [{
    description: "Monthly premium access to all features",
    unitPrice: 20.0,
    quantity: 1,
  }],
  paymentFrequency: "monthly",
  mode: "subscription",
  tributaryConfig: {
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    recipient: "SERVICE_AGENT_WALLET",
    trackingId: "user_123_monthly_premium",
    autoRenew: true,
  },
});

console.log(session.url); // Share this with customer agent`,
    },
  },
  {
    title: 'CUSTOMER AGENT FLOW',
    subtitle: 'Following SKILL.md instructions',
    imageUrl: '/dev-env.svg',
    points: [
      'Lando page decodes base64url subscription data',
      'Displays custom SKILL.md with exact Tributary SDK commands',
      'Customer agent follows instructions to create policy',
      'Token delegation enables automatic recurring payments',
    ],
    codeExample: {
      title: 'Customer Agent Subscribes via Tributary SDK',
      code: `import { Tributary } from "@tributary-so/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
const tributary = new Tributary(new Connection("https://api.mainnet-beta.solana.com"), Keypair.fromSecretKey(/* agent key */));
const subscription = await tributary.createSubscription({
  tokenMint: new PublicKey(data.tokenMint),
  recipient: new PublicKey(data.recipient),
  amount: new BN(data.amount),
  memo: tributary.encodeMemo(data.trackingId, 64),
  frequency: data.paymentFrequency,
  autoRenew: data.autoRenew,
  maxRenewals: data.maxRenewals,
});
const signature = await connection.sendTransaction(
  subscription.transaction,
  [wallet],
);
console.log("✅ Subscribed:", signature);`,
    },
  },
  {
    title: 'TECHNICAL ARCHITECTURE',
    subtitle: 'Frontend + Backend + Smart Contracts',
    imageUrl: '/visual-data.svg',
    points: [
      'Frontend: Vite + React 19 + TypeScript + Tailwind',
      'Backend: Tributary SDK + Solana Web3.js',
      'Smart Contracts: Tributary protocol for recurring payments',
      'URL Encoding: Base64URL for compact, safe data transmission',
    ],
    stats: {
      label: 'Technical Stack',
      items: [
        { value: 'React 19', label: 'Frontend' },
        { value: 'Tributary', label: 'Protocol' },
        { value: 'Solana', label: 'Network' },
      ],
    },
  },
  {
    title: 'AI-DRIVEN DEVELOPMENT',
    subtitle: 'An AI agent built this entire project',
    imageUrl: '/growth.svg',
    metrics: [
      { value: '100%', label: 'AI Written' },
      { value: '0', label: 'Human Commits' },
      { value: '4', label: 'Core Components' },
      { value: '1', label: 'Day Build Time' },
    ],
    points: [
      'Service agents use Lando skills to generate subscription URLs',
      'Customer agents receive URLs and follow autonomous subscription flow',
      'Zero human intervention required after initial skill deployment',
      'Enables true agent-to-agent commerce',
    ],
  },
  {
    title: 'GOALS & ACHIEVEMENTS',
    subtitle: 'Colosseum Agent Hackathon Deliverables',
    imageUrl: '/proud.svg',
    grid: [
      { category: 'Agent Commerce', examples: 'Service agents get paid' },
      { category: 'Autonomous', examples: 'Zero human intervention' },
      { category: 'Deployed', examples: 'lando.tributary.so live' },
      { category: 'Tributary Integration', examples: 'Native protocol support' },
      { category: 'URL-Based', examples: 'Shareable subscription links' },
      { category: 'SKILL.md Format', examples: 'Agent-readable instructions' },
    ],
    demo: {
      features: [
        { icon: '🤖', text: 'AI-built entire stack', status: 'Proven' },
        { icon: '🔗', text: 'URL-based subscriptions', status: 'Live' },
        { icon: '💳', text: 'USDC payments', status: 'Supported' },
        { icon: '📋', text: 'SKILL.md instructions', status: 'Auto-generated' },
      ],
    },
    footer: 'colosseum.com/agent-hackathon/projects/ai-agent-subscription-protocol-on-solana',
  },
  {
    title: 'TRY IT LIVE',
    subtitle: 'Visit lando.tributary.so',
    imageUrl: '/demo-contribute.so-form.png',
    points: [
      'Service agents: Generate subscription URLs for your services',
      'Customer agents: Visit URLs and subscribe autonomously',
      'Built on Tributary: Non-custodial, automated recurring payments',
    ],
    cta: 'lando.tributary.so • Stripe for AI Agents',
    footer: 'github.com/tributary-so • Colosseum Agent Hackathon 2025',
  },
]

const variants = {
  enter: { x: 200, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -200, opacity: 0 },
}

export default function LandoPresentationFeature() {
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
                  <div className="shrink-0 w-1.5 h-1.5 bg-primary  mt-2" />
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
                          className="border border-primary px-2 sm:px-3 py-2 text-xs sm:text-sm text-muted-foreground"
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
                  <div key={i} className="border border-primary  p-2 sm:p-3 text-center bg-muted/50">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold mb-1 text-primary">{item.value}</div>
                    <div className="text-xs uppercase text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.architecture && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
              {slide.architecture.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12  mx-auto mb-2 flex items-center justify-center text-primary-foreground text-base sm:text-xl bg-primary border-2 border-primary">
                    {item.step}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold mb-1 text-primary">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {slide.codeExample && (
            <div className="mt-4">
              <div className="text-xs sm:text-sm uppercase mb-2 text-muted-foreground font-semibold">
                {slide.codeExample.title}
              </div>
              <div className="bg-muted/80 text-status-active-400 p-3  text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">{slide.codeExample.code}</pre>
              </div>
            </div>
          )}

          {slide.grid && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {slide.grid.map((item, i) => (
                <div key={i} className="border border-primary  p-2 bg-muted/50">
                  <div className="text-xs sm:text-sm uppercase font-bold mb-1 text-primary">{item.category}</div>
                  <div className="text-xs text-muted-foreground">{item.examples}</div>
                </div>
              ))}
            </div>
          )}

          {slide.metrics && (
            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {slide.metrics.map((metric, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 border-2 border-primary  p-3 sm:p-4 bg-muted/50 text-primary">
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

          {slide.demo && (
            <div className="mt-3">
              <div className="text-xs sm:text-sm uppercase mt-2 mb-2 text-muted-foreground font-semibold">
                Key Features
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {slide.demo.features.map((feature, i) => (
                  <div key={i} className="border border-primary  p-2 flex items-center gap-2 bg-muted/50">
                    <div className="text-lg sm:text-xl">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-foreground">{feature.text}</div>
                      <div className="text-xs uppercase text-primary">{feature.status}</div>
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
                → {slide.cta}
              </div>
            )}
            {slide.footer && <div className="text-xs italic text-muted-foreground/60">{slide.footer}</div>}
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
        className="absolute top-8 right-11 sm:right-15 z-10 p-2 border border-primary  hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute top-8 right-2 z-10 p-2 border border-primary  hover:bg-primary hover:text-primary-foreground transition-all"
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
            className="w-2.5 h-2.5  transition-all border border-primary"
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
