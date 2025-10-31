import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import QRCodeGenerator from '../qrcode'

const slides = [
  {
    title: "Web3's Payment Problem",
    subtitle: '$1.5T subscription economy locked out of Web3',
    imageUrl: '/dev-env.svg',
    points: [
      'No infrastructure for subscriptions or recurring billing',
      'Every payment requires manual wallet approval - killing UX',
      '67% cart abandonment from repeated signing (Recurly 2024)',
      'Businesses lose 30% revenue from payment friction',
    ],
    footer: 'Web2 solved this 20 years ago. Web3 needs Tributary.',
  },
  {
    title: 'EXISTING SOLUTIONS FAIL',
    subtitle: 'Why current approaches dont work',
    imageUrl: '/presentation.svg',
    comparison: {
      headers: ['Solution', 'Problem', 'Tributary Advantage'],
      rows: [
        ['Squads Grid', 'Complex multi-sig setup, requires account creation', 'One-click approval, no setup'],
        ['Helio (MoonPay)', 'KYC required, Payment Reminders for subscriptions', 'Non-custodial, funds stay in wallet'],
        [
          'x402',
          'Require signing every payment, facilitator KYC',
          'Live on mainnet today, smart contract as intermediary',
        ],
        ['Manual payments', 'User must remember & approve each time', 'Automatic execution on schedule'],
      ],
    },
    footer: 'Were the only non-custodial, automated, one-click-setup solution',
  },
  {
    title: 'TRIBUTARY SOLUTION',
    subtitle: 'Sign once, automate forever',
    imageUrl: '/business-decision.svg',
    points: [
      'Non-custodial: Funds stay in your wallet until payment',
      'Native Solana: Sub-cent fees, 400ms settlement',
      'Zero setup: No Signups, no multi-sig complexity',
      'Full control: Pause, resume, or cancel subscriptions anytime',
      'Protocol: One Smart Contract, unlimited businesses on top',
    ],
    stats: {
      label: 'Developer-First Infrastructure',
      items: [
        { value: '< 5 min', label: 'Integration' },
        { value: '< $0.001', label: 'Per payment' },
        { value: '< 400ms', label: 'Settlement' },
      ],
    },
  },
  {
    title: 'HOW IT WORKS + LIVE DEMO',
    imageUrl: '/code-review.svg',
    subtitle: 'Token delegation meets smart contracts',
    architecture: [
      {
        step: '1',
        title: 'Create Policy',
        desc: 'Amount, interval, recipient',
      },
      {
        step: '2',
        title: 'Delegate',
        desc: 'SPL token authority',
      },
      {
        step: '3',
        title: 'Execute',
        desc: 'Automatically execute when due',
      },
      {
        step: '4',
        title: 'Control',
        desc: 'Pause/resume anytime',
      },
    ],
    demo: {
      features: [
        { icon: '✓', text: 'Create subscription in 1 click', status: 'Live' },
        { icon: '✓', text: 'Dashboard for all policies', status: 'Live' },
        { icon: '✓', text: 'Execute/pause/resume/delete', status: 'Live' },
        { icon: '✓', text: 'TypeScript + React SDK', status: 'Live' },
      ],
    },
    video:
      'https://www.youtube.com/embed/0irXnJaL_Rs?autoplay=1&enablejsapi=1&showinfo=0&controls=0&modestbranding=1&rel=0&loop=1',
    cta: 'tributary.so - Devnet + Mainnet',
    footer: 'Built on SPL Token Extensions • Full source: github.com/tributary-so',
  },
  {
    title: 'MARKET & USE CASES',
    subtitle: 'Powering every Web3 business model',
    imageUrl: '/visual-data.svg',
    market: [
      {
        segment: 'Global Subscriptions',
        size: '$1.5T',
        growth: '+18% CAGR',
      },
      {
        segment: 'Web3 Payments',
        size: '$50B+',
        growth: '+156% YoY',
      },
    ],
    grid: [
      { category: 'SaaS', examples: 'Dev tools, APIs' },
      { category: 'Creators', examples: 'Memberships' },
      { category: 'Gaming', examples: 'Season passes' },
      { category: 'DeFi', examples: 'Strategy fees' },
      { category: 'DAOs', examples: 'Treasury automation' },
      { category: 'AI', examples: 'Agent Fees' },
    ],
  },
  {
    title: 'TRACTION & TEAM',
    subtitle: 'Built in 3 weeks for Colosseum Hackathon',
    imageUrl: '/growth.svg',
    metrics: [
      { value: '100%', label: 'MVP complete' },
      { value: '4', label: 'Demo flows' },
      { value: '3', label: 'Packages' },
      { value: '0', label: 'Competitors' },
    ],
    team: {
      title: 'Experienced Team',
      points: [
        '10+ years combined Web3, DeFi & payment systems experience',
        'Rust/Solana experts + React specialists + security expertice',
        '>5 operational projects on Solana alone',
      ],
    },
    footer: 'Ready to build the payment infrastructure Web3 needs',
  },
  {
    title: 'GET STARTED',
    subtitle: 'Recurring payments & donations for Web3',
    imageUrl: '/proud.svg',
    points: [
      'SDK for recurring payments integration',
      'Badge for monthly donations via contribute.so',
      // starting at 31. Oct 2025
      '🎉 50% off of protocol fees for the next 6 months 🎉',
    ],
    sideImage: '/demo-contribute.so-form.png',
    footer: 'tributary.so • Built on Solana',
    qrCodes: [{ url: 'https://contribute.so', title: 'contribute.so' }],
  },
]

const variants = {
  enter: { x: 200, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -200, opacity: 0 },
}

export default function PresentationFeature() {
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

          {slide.comparison && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
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
                    <tr key={i} className="bg-gray-50">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="border border-primary px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-700"
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
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

          {slide.demo && (
            <div className="mt-3">
              <div className="text-xs sm:text-sm uppercase mt-2 mb-2 text-gray-600 font-semibold">Live Features</div>
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

          {slide.market && (
            <div className="mt-4 space-y-2">
              {slide.market.map((item, i) => (
                <div key={i} className="border border-primary rounded p-2 sm:p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-xs sm:text-sm text-gray-800">{item.segment}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-xl font-bold text-primary">{item.size}</div>
                      <div className="text-xs text-gray-600">{item.growth}</div>
                    </div>
                  </div>
                </div>
              ))}
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

          {slide.metrics && (
            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {slide.metrics.map((metric, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 border-2 border-primary rounded-lg p-3 sm:p-4 bg-gray-50 text-primary">
                      {metric.value}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold uppercase text-gray-600 mt-1">{metric.label}</div>
                  </div>
                ))}
              </div>
              {slide.team && (
                <div className="mt-5 border-t-2 border-primary pt-4">
                  <div className="text-xl font-bold uppercase mb-3 text-primary">{slide.team.title}</div>
                  <div className="space-y-2">
                    {slide.team.points.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                        <span className="text-primary font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            {slide.footer && <div className="text-xs italic text-gray-400">{slide.footer}</div>}
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

        {/* END */}
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
            {slides[currentSlide].video || slides[currentSlide].sideImage ? (
              <div className="grid grid-cols-2 gap-2">
                {renderSlide(slides[currentSlide])}
                {slides[currentSlide].video && (
                  <div className="flex items-start justify-center">
                    <iframe
                      src={slides[currentSlide].video}
                      title="Demo Video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                {slides[currentSlide].sideImage && (
                  <div className="flex items-center justify-center">
                    <img className="h-100" src={slides[currentSlide].sideImage} />
                  </div>
                )}
              </div>
            ) : (
              <>{renderSlide(slides[currentSlide])}</>
            )}
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
