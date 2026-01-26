import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const slides = [
  {
    title: 'WHAT IS x402?',
    subtitle: 'HTTP 402 Payment Required - The Future of Web Payments',
    imageUrl: '/code-review.svg',
    points: [
      'HTTP 402 is the proposed status code for "Payment Required"',
      'Instead of just returning an error, x402 provides payment quotes',
      'Clients pay with signed blockchain transactions',
      'x402 is the first real implementation using Solana + Tributary for deferred payments',
    ],
    footer: 'Proposed in 1997, x402 brings it to life with Web3 subscriptions',
  },
  {
    title: 'THE PROBLEM x402 SOLVES',
    subtitle: 'Micropayments and paywalled content are broken on the web',
    imageUrl: '/presentation.svg',
    points: [
      'No practical way to charge tiny amounts for individual articles, API calls, or digital resources',
      'Traditional payment systems have high fees that make micropayments economically unviable',
      'No standardized protocol for servers to signal "payment required" and clients to handle payments',
      'Manual checkout processes create friction for small, frequent transactions',
    ],
    footer: 'x402 + Tributary = Seamless micropayments for the web',
  },
  {
    title: 'WHY x402 NEEDS TRIBUTARY',
    subtitle: 'x402 alone creates UX friction and security risks',
    imageUrl: '/presentation.svg',
    points: [
      'Every transaction requires manual wallet signing - users/agents must sign each micropayment',
      'Private key exposure risk - each signature gives potential access to user funds',
      'Poor UX for frequent small payments - users abandon flows requiring repeated transaction approvals',
      'No automation - cannot create subscription-like experiences for recurring content access',
    ],
    comparison: {
      headers: ['x402 Alone', 'x402 + Tributary'],
      rows: [
        ['Sign every payment manually', 'Sign once, automate forever'],
        ['High security risk per transaction', 'One-time delegation, contract-enforced'],
        ['Poor UX for subscriptions', 'Seamless $1/month blog access'],
        ['Funds at risk with each signature', 'Funds stay in wallet, controlled by smart contract'],
      ],
    },
    footer: 'Tributary makes x402 practical for real-world micropayment use cases',
  },
  {
    title: 'x402 + TRIBUTARY INTEGRATION',
    subtitle: 'Smart contracts meet HTTP payments',
    imageUrl: '/business-decision.svg',
    points: [
      'x402 provides the payment protocol (HTTP 402 + X-Payment headers)',
      'Tributary provides the smart contract infrastructure',
      'Non-custodial: Funds stay in user wallets',
      'Automated execution: Smart contracts handle recurring payments',
      'One-click setup: Token delegation enables unlimited payments',
    ],
    stats: {
      label: 'Integration Benefits',
      items: [
        { value: '< 5 min', label: 'Setup Time' },
        { value: '0 KYC', label: 'Requirements' },
        { value: 'Sub-cent', label: 'Fees' },
      ],
    },
  },
  {
    title: 'HOW x402 WORKS',
    subtitle: 'Deferred payment flow with JWT access',
    imageUrl: '/dev-env.svg',
    architecture: [
      {
        step: '1',
        title: 'Request Premium',
        desc: 'Client requests protected content',
      },
      {
        step: '2',
        title: '402 Quote',
        desc: 'Server returns subscription details',
      },
      {
        step: '3',
        title: 'Create Subscription',
        desc: 'Client uses Tributary SDK to create tx',
      },
      {
        step: '4',
        title: 'X-Payment Header',
        desc: 'Signed transaction sent via X-Payment',
      },
      {
        step: '5',
        title: 'Verify & Submit',
        desc: 'Server submits tx, confirms on-chain',
      },
      {
        step: '6',
        title: 'JWT Access',
        desc: 'Server returns JWT for future access',
      },
    ],
  },
  {
    title: 'TECHNICAL ARCHITECTURE',
    subtitle: 'Client, server, and middleware components',
    imageUrl: '/visual-data.svg',
    points: [
      'Client: Node.js + Tributary SDK, signs transactions locally',
      'Server: Express.js, verifies transactions and confirms on-chain',
      'Middleware: Handles JWT verification, X-Payment processing',
      'Smart Contracts: Tributary handles recurring payment execution',
    ],
    codeExample: {
      title: 'Server Setup (server.ts)',
      code: `const x402Config = {
  scheme: "deferred",
  network: "solana-devnet",
  amount: 100, // 0.0001 USDC
  recipient: RECIPIENT_WALLET,
  tokenMint: TOKEN_MINT,
  paymentFrequency: "monthly",
  autoRenew: true,
  jwtSecret: JWT_SECRET,
};

app.get("/premium", x402Middleware, (req, res) => {
  res.json({ data: "Premium content!" });
});`,
    },
  },
  {
    title: 'CODE EXAMPLES',
    subtitle: 'Client-side subscription creation',
    imageUrl: '/code-review.svg',
    codeExample: {
      title: 'Client Payment (client.ts)',
      code: `// 1. Get subscription quote
const quote = await fetch("http://localhost:3001/premium");
const q = await quote.json();
// 2. Create subscription transaction
const subscriptionIxs = await sdk.createSubscriptionInstruction(
  tokenMint, recipient, gateway, amount,
  autoRenew, maxRenewals, paymentFrequency,
  createMemoBuffer("x402 subscription")
);
// 3. Sign and send via X-Payment header
const serializedTx = Transaction().add(...subscriptionIxs).serialize().toString("base64");
const xPaymentHeader = Buffer.from(JSON.stringify({
  x402Version: 1,
  scheme: "deferred",
  payload: { serializedTransaction: serializedTx }
})).toString("base64");
const paid = await fetch("http://localhost:3001/premium", {
  headers: { "X-Payment": xPaymentHeader }
});`,
    },
    points: [
      'Client signs transaction locally, never exposes private keys',
      'Server simulates, submits, and verifies on-chain',
      'JWT returned for seamless future access',
    ],
  },
  {
    title: 'USE CASES & DEMO',
    subtitle: 'Powering Web3 subscription economy',
    imageUrl: '/growth.svg',
    grid: [
      { category: 'Content', examples: 'Premium articles, videos' },
      { category: 'SaaS', examples: 'API access, tools' },
      { category: 'Gaming', examples: 'Monthly subscriptions' },
      { category: 'DeFi', examples: 'Strategy fees' },
      { category: 'Creators', examples: 'Patreon-style payments' },
      { category: 'AI', examples: 'Model access fees' },
    ],
    demo: {
      features: [
        { icon: '🚀', text: 'Live on Solana mainnet', status: 'Production' },
        { icon: '⚡', text: 'Sub-cent fees, 400ms settlement', status: 'Fast' },
        { icon: '🔒', text: 'Non-custodial, trustless', status: 'Secure' },
        { icon: '🛠️', text: '<5 min integration', status: 'Easy' },
      ],
    },
    footer: 'github.com/tributary-so • Built for x402 Hackathon',
  },
]

const variants = {
  enter: { x: 200, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -200, opacity: 0 },
}

export default function X402PresentationFeature() {
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
            <span className="text-gray-600 font-semibold">{slide.subtitle}</span>
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
                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                  <div className="text-gray-800 leading-snug">{point}</div>
                </motion.div>
              ))}
            </div>
          )}

          {slide.stats && (
            <div className="mt-4">
              <div className="text-xs sm:text-sm uppercase mb-2 text-gray-600">{slide.stats.label}</div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {slide.stats.items.map((item, i) => (
                  <div key={i} className="border border-primary rounded p-2 sm:p-3 text-center bg-gray-50">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold mb-1 text-primary">{item.value}</div>
                    <div className="text-xs uppercase text-gray-600">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.architecture && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
              {slide.architecture.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-base sm:text-xl bg-primary border-2 border-primary">
                    {item.step}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold mb-1 text-primary">{item.title}</div>
                  <div className="text-xs text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {slide.codeExample && (
            <div className="mt-4">
              <div className="text-xs sm:text-sm uppercase mb-2 text-gray-600 font-semibold">
                {slide.codeExample.title}
              </div>
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '11px',
                }}
              >
                {slide.codeExample.code}
              </SyntaxHighlighter>
            </div>
          )}

          {slide.grid && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {slide.grid.map((item, i) => (
                <div key={i} className="border border-primary rounded p-2 bg-gray-50">
                  <div className="text-xs sm:text-sm uppercase font-bold mb-1 text-primary">{item.category}</div>
                  <div className="text-xs text-gray-600">{item.examples}</div>
                </div>
              ))}
            </div>
          )}

          {slide.demo && (
            <div className="mt-3">
              <div className="text-xs sm:text-sm uppercase mt-2 mb-2 text-gray-600 font-semibold">Key Features</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {slide.demo.features.map((feature, i) => (
                  <div key={i} className="border border-primary rounded p-2 flex items-center gap-2 bg-gray-50">
                    <div className="text-lg sm:text-xl text-primary">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-gray-800">{feature.text}</div>
                      <div className="text-xs uppercase text-primary">{feature.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {slide.footer && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="text-xs italic text-gray-400">{slide.footer}</div>
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
        className="absolute top-8 right-11 sm:right-15 z-10 p-2 border border-primary rounded hover:bg-primary hover:text-white transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute top-8 right-2 sm:right-6 z-10 p-2 border border-primary rounded hover:bg-primary hover:text-white transition-all"
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
            className="w-2.5 h-2.5 rounded-full transition-all border border-primary"
            style={{
              backgroundColor: index === currentSlide ? 'var(--color-primary)' : 'transparent',
            }}
          />
        ))}
      </div>

      <div className="absolute top-4 right-2 sm:right-6 text-xs uppercase tracking-wide text-gray-600">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  )
}
