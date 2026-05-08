import { useState, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SlideTitle = lazy(() => import('./frontier/slide-title'))
const SlideMarket = lazy(() => import('./frontier/slide-market'))
const SlideProblem = lazy(() => import('./frontier/slide-problem'))
const SlideFlow = lazy(() => import('./frontier/slide-flow'))
const SlideModels = lazy(() => import('./frontier/slide-models'))
const SlideInfrastructure = lazy(() => import('./frontier/slide-infrastructure'))
const SlideCompetition = lazy(() => import('./frontier/slide-competition'))
const SlideTraction = lazy(() => import('./frontier/slide-traction'))
const SlideTeam = lazy(() => import('./frontier/slide-team'))
const SlideCTA = lazy(() => import('./frontier/slide-cta'))

function SlideDemo() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Demo
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        We made it
        <br />
        <span className="text-emerald-400">easy to use</span>
      </motion.h2>
    </div>
  )
}

function SlideVideo() {
  return (
    <div className="w-full h-full overflow-hidden -z-10">
      <video
        autoPlay
        muted
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover mt-6"
      >
        <source src="/frontier-demo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

const slides = [
  SlideTitle,
  SlideMarket,
  SlideModels,
  SlideDemo,
  SlideVideo,
  SlideInfrastructure,
  SlideTraction,
  SlideTeam,
  SlideCTA,
  SlideProblem,
  SlideFlow,
  SlideCompetition,
]

const slideLabels = [
  'Title',
  'Market',
  'Problem',
  'Flow',
  'Models',
  'Infrastructure',
  'Competition',
  'Traction',
  'Team',
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

export default function Frontier() {
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
        <span className="font-mono">
          {String(current + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="group relative flex items-center justify-center"
            aria-label={`Go to slide ${index + 1}: ${slideLabels[index]}`}
          >
            <div
              className={`h-1 transition-all duration-300 ${index === current ? 'w-6 bg-emerald-400' : 'w-1.5 bg-muted-foreground/80 hover:bg-muted-foreground/40'
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
