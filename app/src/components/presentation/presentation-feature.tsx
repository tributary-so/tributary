import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import QRCodeGenerator from '../qrcode'

const slides = [
  {
    title: "Web3's Missing Infrastructure",
    subtitle: '$1.5 Trillion subscription economy locked out of Web3',
    imageUrl: '/dev-env.svg',
    points: [
      'Every payment requires manual wallet approval - killing user experience',
      'No infrastructure for subscriptions, memberships, or recurring billing',
      'Businesses lose 30% revenue from payment friction (Recurly, 2024)',
      'Users abandon checkout due to repeated signing - 67% cart abandonment',
    ],
    footer: 'Web2 solved this 20 years ago. Web3 still stuck in manual mode.',
  },
  {
    title: 'EXISTING SOLUTIONS FAIL',
    subtitle: 'Why current approaches dont work',
    imageUrl: '/presentation.svg',
    comparison: {
      headers: ['Solution', 'Problem', 'Tributary Advantage'],
      rows: [
        ['Squads Grid', 'Complex multi-sig setup, requires account creation', 'One-click approval, no setup'],
        ['Helio (MoonPay)', 'Custodial, funds locked, centralized', 'Non-custodial, funds stay in wallet'],
        ['Manual payments', 'User must remember & approve each time', 'Automatic execution on schedule'],
      ],
    },
    footer: 'Were the only non-custodial, automated, zero-setup solution',
  },
  {
    title: 'TRIBUTARY',
    subtitle: 'Automated recurring payments on Solana',
    imageUrl: '/business-decision.svg',
    points: [
      'Sign once, payments flow automatically forever',
      'Non-custodial: Funds never leave user wallet until payment',
      'Native Solana: Sub-cent fees, 400ms finality',
      'Zero friction: No account setup, no complex multi-sig',
    ],
    stats: {
      label: 'Developer-First Infrastructure',
      items: [
        { value: '< 5 min', label: 'Integration time' },
        { value: '< $0.001', label: 'Cost per payment' },
        { value: '< 400ms', label: 'Settlement time' },
      ],
    },
  },
  {
    title: 'HOW IT WORKS',
    imageUrl: '/code-review.svg',
    subtitle: 'Token delegation meets smart contracts',
    architecture: [
      {
        step: '1',
        title: 'User creates Policy',
        desc: 'One transaction: amount, interval, recipient',
      },
      {
        step: '2',
        title: 'Delegation to Contract',
        desc: 'SPL token delegate authority (no custody)',
      },
      {
        step: '3',
        title: 'Auto Execution',
        desc: 'Program transfers on schedule via payment processor',
      },
      {
        step: '4',
        title: 'Full Control',
        desc: 'User can pause, resume, or cancel anytime',
      },
    ],
    footer: 'Built on SPL Token Extensions + Solana Program Library',
  },
  {
    title: 'LIVE DEMO',
    subtitle: 'Working on Solana Devnet today',
    imageUrl: '/development.svg',
    demo: {
      features: [
        { icon: '✓', text: 'Create subscription in 1 click', status: 'Live' },
        { icon: '✓', text: 'Dashboard for all policies', status: 'Live' },
        { icon: '✓', text: 'Execute/pause/resume/delete', status: 'Live' },
        { icon: '✓', text: 'TypeScript + React SDK', status: 'Live' },
      ],
    },
    cta: 'tributary.so - Try it now',
    footer: 'Full source code: github.com/tributary-so',
  },
  {
    title: 'MARKET OPPORTUNITY',
    subtitle: 'First mover in massive category',
    imageUrl: '/visual-data.svg',
    market: [
      {
        segment: 'Global Subscription Economy',
        size: '$1.5T',
        growth: '+18% CAGR',
        source: 'Zuora, 2024',
      },
      {
        segment: 'Web3 Payments Volume',
        size: '$50B+',
        growth: '+156% YoY',
        source: 'Chainalysis, 2024',
      },
      {
        segment: 'SaaS Tools on Solana',
        size: '500+',
        growth: 'Need billing',
        source: 'Solana Ecosystem',
      },
    ],
    footer: 'Zero competition for non-custodial automated payments on Solana',
  },
  {
    title: 'USE CASES',
    subtitle: 'Powering every Web3 business model',
    imageUrl: '/subscriptions.svg',
    grid: [
      { category: 'SaaS', examples: 'Dev tools, analytics, APIs' },
      { category: 'Creators', examples: 'Memberships, exclusive content' },
      { category: 'Gaming', examples: 'Season passes, subscriptions' },
      { category: 'DeFi', examples: 'Strategy fees, yield automation' },
      { category: 'DAOs', examples: 'Treasury automation, grants' },
      { category: 'Commerce', examples: 'Product subscriptions, rentals' },
    ],
    footer: 'Any business that needs predictable revenue',
  },
  {
    title: 'TRACTION',
    subtitle: 'Built in 3 weeks for Colosseum Hackathon',
    imageUrl: '/growth.svg',
    metrics: [
      { value: '100%', label: 'MVP Feature complete' },
      { value: '4', label: 'Working demo flows' },
      { value: '3', label: 'Packages shipped' },
      // { value: '2', label: 'Proof of Concepts' },
      { value: '0', label: 'Direct competitors' },
    ],
  },
  // {
  //   title: 'NEXT: MAINNET',
  //   subtitle: 'Path to production',
  //   roadmap: [
  //     { phase: 'Now', items: ['Security audit with OtterSec', 'Mainnet deployment'] },
  //     { phase: 'Q1 2025', items: ['Webhook system', 'Multi-token support', 'Analytics dashboard'] },
  //     { phase: 'Q2 2025', items: ['Cross-chain via Wormhole', 'Mobile SDK', 'Enterprise features'] },
  //   ],
  //   cta: 'tributary.so • Built on Solana',
  // },
  {
    title: 'Experienced Team Building Web3 Infrastructure',
    subtitle: 'Team & Vision',
    imageUrl: '/team.svg',
    points: [
      'Founders: 10+ years combined in Web3, DeFi, and payment systems',
      'Technical Stack: Rust/Solana experts, React specialists, security auditors',
      'Track Record: Multiple successful Web3 projects, payment integrations',
    ],
    footer: 'Ready to build the payment infrastructure Web3 needs',
  },

  {
    title: 'Try now!',
    subtitle: 'Get your donations button for GitHub repos and X accounts',
    imageUrl: '/proud.svg',
    points: ['Integrate recurring payments with our SDK', 'Get a badge for monthly donations via contribute.so'],
    footer: 'Get your badge for donations now!',
    qrCodes: ['https://contribute.so'],
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
    <div className="flex flex-col items-center justify-center h-full w-full px-12">
      <div className="w-full max-w-5xl">
        {slide.imageUrl && (
          <motion.img
            src={slide.imageUrl}
            alt={slide.title}
            className="h-24 object-cover mb-8"
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
        <motion.div
          className="uppercase tracking-wide mb-2 text-4xl font-bold"
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="uppercase">{slide.title}</span>
        </motion.div>

        {slide.subtitle && (
          <motion.div
            className="text-lg mb-6"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-gray-600 font-semibold">{slide.subtitle}</span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }}>
          {slide.points && (
            <div className="space-y-3">
              {slide.points.map((point, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.2 + index * 0.08 }}
                >
                  <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" />
                  <div className="text-black leading-snug">{point}</div>
                </motion.div>
              ))}
            </div>
          )}

          {slide.comparison && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-300">
                    {slide.comparison.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border border-[var(--color-primary)] px-3 py-2 text-left text-sm uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slide.comparison.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border border-[var(--color-primary)] px-3 py-2 text-sm">
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
              <div className="text-sm uppercase mb-3 text-gray-200">{slide.stats.label}</div>
              <div className="grid grid-cols-3 gap-4">
                {slide.stats.items.map((item, i) => (
                  <div key={i} className="border border-[var(--color-primary)] rounded p-3 text-center bg-gray-200">
                    <div className="text-2xl font-bold mb-1">{item.value}</div>
                    <div className="text-xs uppercase bg-gray-200">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.architecture && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {slide.architecture.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl bg-primary">
                    {item.step}
                  </div>
                  <div className="text-sm font-semibold mb-1">{item.title}</div>
                  <div className="text-xs text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {slide.demo && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {slide.demo.features.map((feature, i) => (
                  <div
                    key={i}
                    className="border border-[var(--color-primary)] rounded p-3 flex items-center gap-3 bg-gray-300"
                  >
                    <div className="text-2xl">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{feature.text}</div>
                      <div className="text-xs uppercase">{feature.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.market && (
            <div className="mt-4 space-y-2">
              {slide.market.map((item, i) => (
                <div key={i} className="border border-[var(--color-primary)] rounded p-3 bg-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.segment}</div>
                      <div className="text-xs mt-1 text-gray-600">Source: {item.source}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{item.size}</div>
                      <div className="text-xs text-gray-600">{item.growth}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.grid && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {slide.grid.map((item, i) => (
                <div key={i} className="border border-[var(--color-primary)] rounded p-3 bg-gray-300">
                  <div className="text-sm uppercase font-bold mb-2">{item.category}</div>
                  <div className="text-xs text-gray-600">{item.examples}</div>
                </div>
              ))}
            </div>
          )}

          {slide.metrics && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {slide.metrics.map((metric, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl font-bold mb-1 border-1 rounded-full p-4 bg-gray-300">{metric.value}</div>
                  <div className="text-sm font-semibold uppercase text-gray-600">{metric.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* {slide.roadmap && ( */}
          {/*   <div className="grid grid-cols-3 gap-3 mt-4"> */}
          {/*     {slide.roadmap.map((phase, i) => ( */}
          {/*       <div key={i} className="border border-[var(--color-primary)] rounded p-3 bg-gray-300"> */}
          {/*         <div className="text-sm uppercase font-bold mb-3">{phase.phase}</div> */}
          {/*         <ul className="space-y-1"> */}
          {/*           {phase.items.map((item, j) => ( */}
          {/*             <li key={j} className="text-xs flex items-start gap-2"> */}
          {/*               <span>•</span> */}
          {/*               <span>{item}</span> */}
          {/*             </li> */}
          {/*           ))} */}
          {/*         </ul> */}
          {/*       </div> */}
          {/*     ))} */}
          {/*   </div> */}
          {/* )} */}
        </motion.div>

        {(slide.cta || slide.footer) && (
          <motion.div
            className="mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {slide.cta && <div className="text-lg uppercase tracking-wide mb-2">→ {slide.cta}</div>}
            {slide.footer && <div className="text-xs italic text-gray-400">{slide.footer}</div>}
          </motion.div>
        )}

        {slide.qrCodes && (
          <motion.div
            className="mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="grid grid-cols-3 gap-3 mt-4">
              {slide.qrCodes.map((item, i) => (
                <div key={i}>
                  {/*   <div className="grid grid-cols-3 gap-3 mt-4"> */}
                  <QRCodeGenerator text={item} size="180px" />
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
      className="w-full h-full flex items-center justify-center relative min-h-[80vh]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <button
        onClick={prevSlide}
        className="absolute top-8 left-6 z-10 p-2 border border rounded hover:bg-primary hover:text-white transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute top-8 right-6 z-10 p-2 border border rounded hover:bg-primary hover:text-white transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="w-full h-full">
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

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
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

      <div className="absolute top-4 right-6 text-xs uppercase tracking-wide">
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  )
}
