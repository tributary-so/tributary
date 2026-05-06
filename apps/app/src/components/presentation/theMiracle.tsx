import { useState, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SlideTitle = lazy(() => import('./themiracle/slide-title'))
const SlideOpportunity = lazy(() => import('./themiracle/slide-opportunity'))
const SlideProblem = lazy(() => import('./themiracle/slide-problem'))
const SlideContribute = lazy(() => import('./themiracle/slide-contribute'))
const SlideTrack1 = lazy(() => import('./themiracle/slide-track1'))
const SlideTrack2 = lazy(() => import('./themiracle/slide-track2'))
const SlideValueTable = lazy(() => import('./themiracle/slide-value-table'))
const SlideWhyWin = lazy(() => import('./themiracle/slide-why-win'))
const SlideFlywheel = lazy(() => import('./themiracle/slide-flywheel'))
const SlideGrowth = lazy(() => import('./themiracle/slide-growth'))
const SlideCTA = lazy(() => import('./themiracle/slide-cta'))

const slides = [
  SlideTitle,
  SlideOpportunity,
  SlideProblem,
  SlideContribute,
  SlideTrack1,
  SlideTrack2,
  SlideValueTable,
  SlideWhyWin,
  SlideFlywheel,
  SlideGrowth,
  SlideCTA,
]

const slideLabels = [
  'Title',
  'Opportunity',
  'Problem',
  'Contribute.so',
  'Track 1',
  'Track 2',
  'Value',
  'Why This Wins',
  'Flywheel',
  'Growth',
  'CTA',
]

const variants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
}

function SlideFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-muted-foreground text-xs uppercase tracking-[0.3em]">...</div>
    </div>
  )
}

export default function TheMiracle() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), [])
  const prev = useCallback(() => setCurrent((p) => (p - 1 + slides.length) % slides.length), [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        next()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      }
    },
    [next, prev],
  )

  const CurrentSlide = slides[current]

  return (
    <div
      className="w-full h-full flex items-center justify-center relative bg-background min-h-[95vh]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="w-full h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full h-full [zoom:1.5]"
          >
            <Suspense fallback={<SlideFallback />}>
              <CurrentSlide />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider text-violet-400/60">theMiracle</span>
        <span className="font-mono">
          {String(current + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="group relative flex items-center justify-center"
            aria-label={`Go to slide ${index + 1}: ${slideLabels[index]}`}
          >
            <div
              className={`h-1 transition-all duration-300 ${index === current ? 'w-6 bg-violet-400' : 'w-1.5 bg-muted-foreground/80 hover:bg-muted-foreground/40'
                }`}
            />
            <span className="absolute -top-5 text-[8px] uppercase tracking-wider text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all whitespace-nowrap">
              {slideLabels[index]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
