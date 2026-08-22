import { cn } from '../lib/utils'

export type BackdropVariant = 'grid' | 'mesh' | 'scanlines'
export type BackdropIntensity = 'subtle' | 'normal' | 'bold'

export interface BackdropProps {
  /**
   * `grid` — blueprint grid fading from a primary-tinted origin (technical-terminal).
   * `mesh` — layered radial gradients from the brand anchors.
   * `scanlines` — CRT texture for terminal-heavy sections.
   */
  variant?: BackdropVariant
  /** Overall opacity of the layer. */
  intensity?: BackdropIntensity
  /** Fixed to the viewport instead of the nearest positioned ancestor. */
  fixed?: boolean
  className?: string
}

/**
 * Decorative token-driven backdrop. Pure CSS (see tokens.css), never
 * intercepts pointer events, hidden from assistive tech.
 */
export function Backdrop({ variant = 'grid', intensity = 'normal', fixed = false, className }: BackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('ui-backdrop', `ui-backdrop--${variant}`, `ui-backdrop--${intensity}`, fixed && 'ui-backdrop--fixed', className)}
    />
  )
}
