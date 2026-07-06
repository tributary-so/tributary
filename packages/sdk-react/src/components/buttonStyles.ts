// Shared Tailwind class strings for the convenience button components
// (OneTimeButton, UpToButton). Extracted per R-1/R-2 (review 2026-07-06):
// removes the hard HeroUI/lucide-react deps and dedups the long class
// string that was copy-pasted across both files.

export type ButtonRadius = "none" | "sm" | "md" | "lg" | "full";
export type ButtonSize = "sm" | "md" | "lg";

const RADIUS_CLASS: Record<ButtonRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "text-xs px-2.5 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

/**
 * Build the Tailwind class string for a native `<button>` that mirrors the
 * previous HeroUI Button look. `className` is appended last so callers can
 * override the background / hover colors (e.g. `bg-onetime-600`).
 */
export function buttonClass(
  className: string,
  radius: ButtonRadius = "none",
  size: ButtonSize = "lg",
): string {
  return [
    "inline-flex items-center justify-center font-medium border border-transparent shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    RADIUS_CLASS[radius],
    SIZE_CLASS[size],
    className,
  ].join(" ");
}

// Pure-CSS spinner that replaces lucide-react's Loader2. Same visual weight
// (1em box) so existing layouts don't shift.
export const SPINNER_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" class="animate-spin" style="width:1em;height:1em;margin-right:0.5rem"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path></svg>`;
