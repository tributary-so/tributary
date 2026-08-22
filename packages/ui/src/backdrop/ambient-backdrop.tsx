import { useEffect, useState } from 'react'

import { cn } from '../lib/utils'
import { seededRandom } from '../lib/prng'

/**
 * Wall-clock frame counter driving the ambient layers at `fps`
 * (requestAnimationFrame-scheduled, but the value only changes when the
 * elapsed frame bucket advances). Freezes at frame 0 for
 * prefers-reduced-motion users.
 */
function useWallClockFrame(fps = 30): number {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    let raf = 0
    const start = performance.now()
    let last = -1
    const tick = (now: number) => {
      const value = Math.floor(((now - start) / 1000) * fps)
      if (value !== last) {
        last = value
        setFrame(value)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fps])

  return frame
}

/**
 * AmbientBackdrop — the animated canvas behind hero sections: a port of
 * Accord's frame-driven Backdrop, squares instead of dots, tuned for
 * light backgrounds first. Four deterministic layers, all pure functions
 * of a `frame` counter (no CSS animations, no wall clock inside the
 * paint):
 *
 *   1. ledger grid — hairline grid drifting diagonally, terminal feel
 *   2. key field   — seeded squares on slow lissajous drifts, rotating
 *                    slowly; a few pulse primary
 *   3. brand glow  — one large primary radial glow orbiting slowly
 *   4. vignette    — faint foreground tint at the edges so content
 *                    reads on top
 *
 * Light-mode tuning: grid and squares sit at low alpha over the token
 * background, the glow is a whisper of primary. Every color rides the
 * design tokens (`--foreground`, `--muted-foreground`, `--primary`), so
 * dark mode keeps working for free.
 *
 * `frame` is optional — pass one for deterministic renders (stories,
 * video exports); omit it and the component drives itself, frozen at
 * frame 0 under prefers-reduced-motion. `seed` varies the square field
 * per scene.
 */
export function AmbientBackdrop({
  frame,
  seed = 'tributary',
  fixed = false,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  /** Deterministic frame override; omit for self-driving wall-clock motion. */
  frame?: number
  /** Varies the square field per scene. */
  seed?: string
  /** Pin to the viewport instead of the nearest positioned ancestor. */
  fixed?: boolean
  className?: string
  'aria-hidden'?: boolean
}) {
  const wallFrame = useWallClockFrame()
  const f = frame ?? wallFrame

  const nodes = Array.from({ length: 24 }, (_, i) => {
    const r = (n: string) => seededRandom(`${seed}:${i}:${n}`)
    return {
      x: 3 + r('x') * 94,
      y: 4 + r('y') * 92,
      ampX: 10 + r('ax') * 22,
      ampY: 7 + r('ay') * 15,
      phase: r('p') * Math.PI * 2,
      speed: 0.4 + r('s') * 0.8,
      size: 4 + Math.round(r('sz') * 4),
    }
  })

  // Grid drift: 96px per 900 frames on both axes — the pattern is
  // 96px-periodic, so the modulo cycle is seamless and infinite.
  // Applied via background-position so the box never exposes an edge.
  const drift = (f * 96) % 96

  return (
    <div
      aria-hidden={ariaHidden}
      className={cn('overflow-hidden', className)}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {/* 1 — ledger grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'repeating-linear-gradient(to right, hsl(var(--foreground) / 0.055) 0 1px, transparent 1px 96px)',
            'repeating-linear-gradient(to bottom, hsl(var(--foreground) / 0.055) 0 1px, transparent 1px 96px)',
          ].join(', '),
          backgroundPosition: `${drift}px ${drift}px`,
        }}
      />

      {/* 2 — key field */}
      {nodes.map((n, i) => {
        const px = n.x + Math.sin(f * 0.01 * n.speed + n.phase) * n.ampX
        const py = n.y + Math.cos(f * 0.008 * n.speed + n.phase * 1.7) * n.ampY
        const glow = Math.pow(
          Math.max(0, Math.sin(f * 0.012 + n.phase * 3.1)),
          14,
        )
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${px}%`,
              top: `${py}%`,
              width: n.size,
              height: n.size,
              marginLeft: -n.size / 2,
              marginTop: -n.size / 2,
              backgroundColor:
                glow > 0.02
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground) / 0.55)',
              opacity: 0.35 + glow * 0.6,
              rotate: `${f * 0.15 * n.speed + (n.phase * 180) / Math.PI}deg`,
              scale: String(1 + glow * 1.2),
            }}
          />
        )
      })}

      {/* 3 — brand glow */}
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          left: '12%',
          top: -320,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 60%)',
          translate: `${Math.sin(f * 0.004) * 240}px ${Math.cos(f * 0.0032) * 130}px`,
          opacity: 0.55,
        }}
      />

      {/* 4 — vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 55%, hsl(var(--foreground) / 0.05) 100%)',
        }}
      />
    </div>
  )
}
