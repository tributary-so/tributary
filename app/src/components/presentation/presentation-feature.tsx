import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@heroui/button'

const slides = [
  {
    title: "Web3's Missing Infrastructure",
    subtitle: 'Why?',
    imageUrl: '/dev-env.svg',
    content: [
      'Web3 promises automation but lacks fundamental payment infrastructure',
      'Every business needs predictable, automated revenue streams',
      'Current solutions: Manual transactions, locked funds, poor UX',
      'Developers waste months building payment systems from scratch',
      '$2T+ global economy runs on automated payments - Web3 has none',
    ],
    footer: 'From SaaS subscriptions to memberships, automated payments power everything',
  },
  {
    title: 'Subscriptions Are Just the Beginning',
    subtitle: 'Why Tributary Matters',
    imageUrl: '/presentation.svg',
    content: [
      'Entry Point: Subscriptions showcase with $500B+ proven market',
      'Real Opportunity: Foundation for ALL automated payment use cases',
      'Micropayments Breakthrough: Finally makes micropayments convenient',
      'Developer Focus: Enable 1000s of businesses to integrate payments seamlessly',
      'Ecosystem Vision: From creator tips to DAO treasuries, insurance premiums to NFT rentals',
    ],
  },
  {
    title: 'One Protocol, Infinite Possibilities',
    subtitle: 'How Tributary Works',
    imageUrl: '/code-review.svg',
    content: [
      'Token Delegation: Users approve once, enable automated payments forever',
      'Flexible Policies: Support any payment model - subscriptions, installments, usage-based, donations',
      'No Lock-Up: Funds stay in user wallets, payments flow directly',
      'Provider Ecosystem: Developers build specialized payment services on top',
    ],
    footer: 'Simple infrastructure that powers complex payment ecosystems',
  },
  {
    title: 'Powering Every Business Model',
    subtitle: 'How Developers Integrate',
    imageUrl: '/visual-data.svg',
    code: `// One line integration
<SubscriptionButton amount={fee} interval={"monthly"} recipient={yourWallet} />`,
    sections: [
      {
        title: 'For SaaS Platforms:',
        items: ['Software subscriptions'],
      },
      {
        title: 'For Content Creators:',
        items: ['Fan subscription management', 'Micropayment Donations', 'Exclusive content access'],
      },
      {
        title: 'For DeFi Protocols:',
        items: ['Automated yield distributions', 'Staking reward payments', 'Insurance premium collections'],
      },
    ],
    footer: 'Any business model becomes possible with automated payments',
  },
  {
    title: 'Live Demo - The Foundation in Action',
    subtitle: "What We've Built",
    imageUrl: '/development.svg',
    content: [
      'Working subscription prototype on Solana',
      'React SDK for easy integration',
      'TypeScript SDK for advanced use cases',
      'Smart contracts handling complex payment policies',
    ],
    footer: 'Subscriptions prove the concept - the protocol enables everything else',
  },
  {
    title: '$2T+ Market Opportunity',
    subtitle: 'Market & Business Model',
    imageUrl: '/market-analysis.svg',
    content: [
      'Addressable Market: $2T+ global automated payments economy',
      'Entry Market: $500B+ subscription segment for initial traction',
      'Business Model: 2% protocol fee on all payments + provider fee',
      'Revenue Potential: $100M+ annual from protocol fees as ecosystem grows',
      'Funding Ask: $250K for developer adoption and ecosystem expansion',
    ],
    footer: "We're not competing in subscriptions - we're enabling the entire automated payments industry",
  },
  {
    title: 'Experienced Team Building Web3 Infrastructure',
    subtitle: 'Team & Vision',
    imageUrl: '/team.svg',
    content: [
      'Founders: 10+ years combined in Web3, DeFi, and payment systems',
      'Technical Stack: Rust/Solana experts, React specialists, security auditors',
      'Track Record: Multiple successful Web3 projects, payment integrations',
      'Mission: Democratize automated payments for every Web3 business',
    ],
    footer: 'Ready to build the payment infrastructure Web3 needs',
  },
]

const variants = {
  enter: { x: 300, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
}

export default function PresentationFeature() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const renderSlide = (slide: (typeof slides)[0]) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 max-w-4xl mx-auto">
      <div className="w-full max-w-2xl">
        {slide.imageUrl && (
          <motion.img
            src={slide.imageUrl}
            alt={slide.title}
            className="h-48 object-cover rounded-lg mb-6 mx-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
        <motion.h1
          className="text-4xl font-bold text-gray-900 mb-4 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {slide.title}
        </motion.h1>
        {slide.subtitle && (
          <motion.h2
            className="text-2xl text-blue-600 mb-6 text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {slide.subtitle}
          </motion.h2>
        )}
        {slide.content && (
          <motion.ul
            className="list-disc list-inside space-y-2 text-lg text-gray-700 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {slide.content.map((item, index) => (
              <motion.li
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
        )}
        {slide.code && (
          <motion.pre
            className="bg-gray-100 p-4 rounded-lg text-sm font-mono mb-6 overflow-x-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {slide.code}
          </motion.pre>
        )}
        {slide.sections && (
          <div className="space-y-4 mb-6">
            {slide.sections.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + sectionIndex * 0.2 }}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{section.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
        {slide.footer && (
          <motion.p
            className="text-center text-gray-600 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {slide.footer}
          </motion.p>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          onPress={prevSlide}
          variant="ghost"
          size="lg"
          className="p-3 rounded-full bg-white shadow-lg hover:bg-gray-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
        <Button
          onPress={nextSlide}
          variant="ghost"
          size="lg"
          className="p-3 rounded-full bg-white shadow-lg hover:bg-gray-50"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
      <div className="relative min-h-[90vh] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {renderSlide(slides[currentSlide])}
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full ${index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
