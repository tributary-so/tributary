import { motion, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const NODES = [
  {
    label: 'Devs Join',
    desc: 'Signup bonus + Builder Boost',
    accent: 'emerald',
    angleDeg: 270, // top
  },
  {
    label: 'Supporters Discover',
    desc: '2x match + SOL draws',
    accent: 'blue',
    angleDeg: 330, // top-right
  },
  {
    label: 'Donations Flow',
    desc: 'Recurring USDC, on-chain',
    accent: 'violet',
    angleDeg: 30, // bottom-right
  },
  {
    label: 'Devs Earn',
    desc: 'Fee-free + 10% bonus',
    accent: 'emerald',
    angleDeg: 90, // bottom
  },
  {
    label: 'Word of Mouth',
    desc: 'Referral program kicks in',
    accent: 'amber',
    angleDeg: 150, // bottom-left
  },
  {
    label: 'More Devs Join',
    desc: 'Flywheel accelerates',
    accent: 'emerald',
    angleDeg: 210, // top-left
  },
]

const ACCENT_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    dot: '#34d399',
  },
  blue: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/8',
    text: 'text-blue-400',
    dot: '#60a5fa',
  },
  violet: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/8',
    text: 'text-violet-400',
    dot: '#a78bfa',
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/8',
    text: 'text-amber-400',
    dot: '#fbbf24',
  },
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

// SVG center and radius
const CX = 300
const CY = 300
const ORBIT_R = 200
const NODE_W = 180
const NODE_H = 50

// Arc path between two angles (clockwise) on the orbit circle
function arcPath(startDeg: number, endDeg: number, r: number, cx: number, cy: number) {
  const startRad = toRad(startDeg)
  const endRad = toRad(endDeg)
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  // Always short arc (nodes are 60° apart)
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
}

// Dot position along arc (0–1)
function pointOnArc(startDeg: number, endDeg: number, t: number, r: number, cx: number, cy: number) {
  const deg = startDeg + (endDeg - startDeg) * t
  const rad = toRad(deg)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function FlowDot({ startDeg, endDeg, delay, color }: { startDeg: number; endDeg: number; delay: number; color: string }) {
  const [t, setT] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const DURATION = 1600 // ms per arc segment

  useEffect(() => {
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts - delay * DURATION
      const elapsed = (ts - startRef.current) % DURATION
      setT(elapsed / DURATION)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [delay])

  const pos = pointOnArc(startDeg, endDeg, t, ORBIT_R - 2, CX, CY)
  return <circle cx={pos.x} cy={pos.y} r={3.5} fill={color} opacity={0.9} />
}

export default function SlideFlywheel() {
  const wheelControls = useAnimation()

  useEffect(() => {
    wheelControls.start({
      rotate: 360,
      transition: { duration: 32, repeat: Infinity, ease: 'linear' },
    })
  }, [wheelControls])

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 py-4">
      {/* Header */}
      <motion.p
        className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        The Flywheel
      </motion.p>

      <motion.h2
        className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-1 text-center leading-tight"
        style={{ fontFamily: 'var(--font-secondary)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Self-reinforcing.{' '}
        <span className="text-emerald-400">Self-sustaining.</span>
      </motion.h2>

      <motion.p
        className="text-sm text-muted-foreground mb-5 text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Each side of the marketplace makes the other more valuable. The incentive period starts the engine — recurring
        payments keep it running.
      </motion.p>

      <div className="max-w-3xl w-full space-y-3 grid grid-cols-2">
        {/* Flywheel SVG */}
        <motion.div
          className="w-[400px] max-w-2xl"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <svg viewBox="0 0 600 600" className="w-full h-auto" style={{ overflow: 'visible' }}>
            {/* Outer decorative rings */}
            <circle cx={CX} cy={CY} r={ORBIT_R + 28} fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" className="text-foreground/10" />
            <circle cx={CX} cy={CY} r={ORBIT_R + 12} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/8" />

            {/* Spinning wheel group */}
            <motion.g animate={{ rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: 'linear' }} style={{ originX: CX, originY: CY }}>
              {/* Spokes */}
              {NODES.map((node, i) => {
                const rad = toRad(node.angleDeg)
                return (
                  <line
                    key={i}
                    x1={CX}
                    y1={CY}
                    x2={CX + (ORBIT_R - 4) * Math.cos(rad)}
                    y2={CY + (ORBIT_R - 4) * Math.sin(rad)}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-foreground/10"
                  />
                )
              })}
              {/* Inner ring */}
              <circle cx={CX} cy={CY} r={64} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-foreground/15" />
            </motion.g>

            {/* Orbit ring */}
            <circle cx={CX} cy={CY} r={ORBIT_R} fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground/12" />

            {/* Arc segments between nodes + flow dots */}
            {NODES.map((node, i) => {
              const next = NODES[(i + 1) % NODES.length]
              const startDeg = node.angleDeg
              const endDeg = next.angleDeg < startDeg ? next.angleDeg + 360 : next.angleDeg
              const dotColor = ACCENT_COLORS[node.accent].dot
              return (
                <g key={i}>
                  <path
                    d={arcPath(startDeg, endDeg, ORBIT_R, CX, CY)}
                    fill="none"
                    stroke={dotColor}
                    strokeWidth="1"
                    opacity={0.25}
                  />
                  <FlowDot
                    startDeg={startDeg}
                    endDeg={endDeg > 360 ? endDeg - 360 + startDeg : endDeg}
                    delay={i / NODES.length}
                    color={dotColor}
                  />
                </g>
              )
            })}

            {/* Center hub */}
            <circle cx={CX} cy={CY} r={56} className="fill-background" stroke="currentColor" strokeWidth="0.5" style={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <circle cx={CX} cy={CY} r={40} fill="none" stroke="currentColor" strokeWidth="0.5" style={{ stroke: 'rgba(255,255,255,0.06)' }} />
            <motion.text
              x={CX}
              y={CY - 7}
              textAnchor="middle"
              fontSize="8"
              letterSpacing="0.15em"
              fill="currentColor"
              className="text-muted-foreground"
              style={{ textTransform: 'uppercase' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              ecosystem
            </motion.text>
            <motion.text
              x={CX}
              y={CY + 9}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
              className="text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              flywheel
            </motion.text>

            {/* Node cards */}
            {NODES.map((node, i) => {
              const rad = toRad(node.angleDeg)
              const nx = CX + ORBIT_R * Math.cos(rad)
              const ny = CY + ORBIT_R * Math.sin(rad)
              const colors = ACCENT_COLORS[node.accent]

              return (
                <motion.g
                  key={node.label}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                >
                  {/* Card background */}
                  <rect
                    x={nx - NODE_W / 2}
                    y={ny - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx="6"
                    fill="rgb(255,255,255)"
                    stroke={colors.dot}
                    strokeOpacity={0.95}
                    strokeWidth="0.75"
                  />
                  {/* Accent dot */}
                  <circle cx={nx - NODE_W / 2 + 10} cy={ny} r={2.5} fill={colors.dot} opacity={0.8} />
                  {/* Label */}
                  <text
                    x={nx - NODE_W / 2 + 20}
                    y={ny - 7}
                    fontSize="13"
                    fontWeight="800"
                    fill={colors.dot}
                    letterSpacing="0.02em"
                  >
                    {node.label}
                  </text>
                  {/* Desc */}
                  <text
                    x={nx - NODE_W / 2 + 20}
                    y={ny + 8}
                    fontSize="11"
                    fill="currentColor"
                    fillOpacity={0.5}
                  >
                    {node.desc}
                  </text>
                </motion.g>
              )
            })}
          </svg>
        </motion.div>
        <div>

          {/* Stat callout */}
          <motion.div
            className="border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 max-w-2xl w-full text-center mt-1"
            style={{ borderRadius: 6 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <p className="text-xs text-foreground/70">
              If 30% of supporters maintain subscriptions after the incentive period:{' '}
              <span className="text-foreground/90">150 recurring donations</span> generating{' '}
              <span className="font-bold text-emerald-400">$750–1,500/mo</span> in sustainable open-source funding.{' '}
              Permanently. On-chain. Zero ongoing marketing spend.
            </p>
          </motion.div>
        </div>
      </div>
    </div >
  )
}
