import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    title: 'THE PROBLEM',
    subtitle: '$1.5 Trillion subscription economy locked out of Web3',
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
        { value: '$0.0001', label: 'Cost per payment' },
        { value: '400ms', label: 'Settlement time' },
      ],
    },
  },
  {
    title: 'HOW IT WORKS',
    subtitle: 'Token delegation meets smart contracts',
    architecture: [
      {
        step: '1',
        title: 'User Approves Policy',
        desc: 'One transaction: amount, interval, recipient',
      },
      {
        step: '2',
        title: 'Token Delegation',
        desc: 'SPL token delegate authority (no custody)',
      },
      {
        step: '3',
        title: 'Auto Execution',
        desc: 'Program transfers on schedule via gateway',
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
    demo: {
      features: [
        { icon: '✓', text: 'Create subscription in 1 click', status: 'Live' },
        { icon: '✓', text: 'Dashboard for all policies', status: 'Live' },
        { icon: '✓', text: 'Execute/pause/resume/delete', status: 'Live' },
        { icon: '✓', text: 'TypeScript + React SDK', status: 'Live' },
      ],
    },
    cta: 'tributary.so - Try it now',
    footer: 'Full source code: github.com/tributary-labs',
  },
  {
    title: 'MARKET OPPORTUNITY',
    subtitle: 'First mover in massive category',
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
    metrics: [
      { value: '100%', label: 'Feature complete' },
      { value: '3', label: 'Working demo flows' },
      { value: '2', label: 'SDKs shipped' },
      { value: '0', label: 'Direct competitors' },
    ],
    footer: 'Ready for mainnet launch post-audit',
  },
  {
    title: 'NEXT: MAINNET',
    subtitle: 'Path to production',
    roadmap: [
      { phase: 'Now', items: ['Security audit with OtterSec', 'Mainnet deployment'] },
      { phase: 'Q1 2025', items: ['Webhook system', 'Multi-token support', 'Analytics dashboard'] },
      { phase: 'Q2 2025', items: ['Cross-chain via Wormhole', 'Mobile SDK', 'Enterprise features'] },
    ],
    cta: 'tributary.so • Built on Solana',
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
    <div
      className="flex flex-col items-center justify-center h-full w-full px-12"
      style={{ fontFamily: 'var(--font-primary)' }}
    >
      <div className="w-full max-w-5xl">
        <motion.div
          className="uppercase tracking-wide mb-2"
          style={{
            fontFamily: 'var(--font-secondary)',
            fontSize: '2.75rem',
            lineHeight: '1',
            color: 'var(--color-primary)',
            fontWeight: 'normal',
          }}
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {slide.title}
        </motion.div>

        {slide.subtitle && (
          <motion.div
            className="text-lg mb-6"
            style={{ color: '#666' }}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {slide.subtitle}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
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
                  <div
                    className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                  <div className="text-base leading-snug" style={{ color: '#333' }}>
                    {point}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {slide.comparison && (
            <div className="mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#f5f7f7' }}>
                    {slide.comparison.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border border-[var(--color-primary)] px-3 py-2 text-left text-sm uppercase"
                        style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
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
              <div className="text-sm uppercase mb-3" style={{ color: '#666' }}>
                {slide.stats.label}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {slide.stats.items.map((item, i) => (
                  <div
                    key={i}
                    className="border border-[var(--color-primary)] rounded p-3 text-center"
                    style={{ backgroundColor: '#f5f7f7' }}
                  >
                    <div
                      className="text-2xl font-bold mb-1"
                      style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
                    >
                      {item.value}
                    </div>
                    <div className="text-xs uppercase" style={{ color: '#666' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.architecture && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {slide.architecture.map((item, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      fontFamily: 'var(--font-secondary)',
                    }}
                  >
                    {item.step}
                  </div>
                  <div className="text-sm font-semibold mb-1">{item.title}</div>
                  <div className="text-xs" style={{ color: '#666' }}>
                    {item.desc}
                  </div>
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
                    className="border border-[var(--color-primary)] rounded p-3 flex items-center gap-3"
                    style={{ backgroundColor: '#f5f7f7' }}
                  >
                    <div className="text-2xl">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{feature.text}</div>
                      <div
                        className="text-xs uppercase"
                        style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-secondary)' }}
                      >
                        {feature.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.market && (
            <div className="mt-4 space-y-2">
              {slide.market.map((item, i) => (
                <div
                  key={i}
                  className="border border-[var(--color-primary)] rounded p-3"
                  style={{ backgroundColor: '#f5f7f7' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{item.segment}</div>
                      <div className="text-xs mt-1" style={{ color: '#666' }}>
                        Source: {item.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-xl font-bold"
                        style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
                      >
                        {item.size}
                      </div>
                      <div className="text-xs" style={{ color: '#666' }}>
                        {item.growth}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.grid && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {slide.grid.map((item, i) => (
                <div
                  key={i}
                  className="border border-[var(--color-primary)] rounded p-3"
                  style={{ backgroundColor: '#f5f7f7' }}
                >
                  <div
                    className="text-sm uppercase font-bold mb-2"
                    style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
                  >
                    {item.category}
                  </div>
                  <div className="text-xs" style={{ color: '#666' }}>
                    {item.examples}
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.metrics && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {slide.metrics.map((metric, i) => (
                <div key={i} className="text-center">
                  <div
                    className="text-4xl font-bold mb-1"
                    style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
                  >
                    {metric.value}
                  </div>
                  <div className="text-xs uppercase" style={{ color: '#666' }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.roadmap && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {slide.roadmap.map((phase, i) => (
                <div
                  key={i}
                  className="border border-[var(--color-primary)] rounded p-3"
                  style={{ backgroundColor: '#f5f7f7' }}
                >
                  <div
                    className="text-sm uppercase font-bold mb-3"
                    style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
                  >
                    {phase.phase}
                  </div>
                  <ul className="space-y-1">
                    {phase.items.map((item, j) => (
                      <li key={j} className="text-xs flex items-start gap-2">
                        <span style={{ color: 'var(--color-primary)' }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {(slide.cta || slide.footer) && (
          <motion.div
            className="mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {slide.cta && (
              <div
                className="text-lg uppercase tracking-wide mb-2"
                style={{
                  fontFamily: 'var(--font-secondary)',
                  color: 'var(--color-primary)',
                }}
              >
                → {slide.cta}
              </div>
            )}
            {slide.footer && (
              <div className="text-xs italic" style={{ color: '#999' }}>
                {slide.footer}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )

  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{ height: 'calc(100vh - 200px)' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <button
        onClick={prevSlide}
        className="absolute left-12 top-1/2 -translate-y-1/2 z-10 p-2 border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all"
        style={{ backgroundColor: 'transparent' }}
      >
        <ChevronLeft className="w-4 h-4" style={{ color: 'inherit' }} />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-12 top-1/2 -translate-y-1/2 z-10 p-2 border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all"
        style={{ backgroundColor: 'transparent' }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: 'inherit' }} />
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
            className="w-2.5 h-2.5 rounded-full transition-all border"
            style={{
              backgroundColor: index === currentSlide ? 'var(--color-primary)' : 'transparent',
              borderColor: 'var(--color-primary)',
            }}
          />
        ))}
      </div>

      <div
        className="absolute top-4 right-6 text-xs uppercase tracking-wide"
        style={{ fontFamily: 'var(--font-secondary)', color: 'var(--color-primary)' }}
      >
        {currentSlide + 1} / {slides.length}
      </div>
    </div>
  )
}