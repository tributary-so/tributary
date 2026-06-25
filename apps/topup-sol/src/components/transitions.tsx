import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * transitions.dev React wrappers. Thin components that own the documented
 * class/attribute hooks + the reflow/replay orchestration where the snippets
 * need JS. Each reads its tunable vars from the :root block in transitions.css.
 */

/** Texts reveal — staggered blur-rise for stacked headline + supporting line. */
export function TextsReveal({
  lines,
  className = "",
}: {
  lines: string[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = lines.join("|");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-shown", "is-hiding");
    void el.offsetHeight;
    el.classList.add("is-shown");
  }, [key]);

  return (
    <div ref={ref} className={`t-stagger ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className={`t-stagger-line t-stagger-line--${i + 1}`}>
          {line}
        </span>
      ))}
    </div>
  );
}

/** Pure-CSS tooltip. Wrap a trigger; the tip fades+scales in on hover/focus. */
export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="t-tt-wrap block text-xs text-muted-foreground/70">
      <span className="t-tt-trigger inline-flex mr-2">{children}</span>
      <span role="tooltip" className="t-tt">
        {content}
      </span>
    </span>
  );
}

/**
 * Skeleton loader + reveal. Mounts a pulsing skeleton, swaps to content once
 * `loaded` is true. The two layers share absolute coordinates so the swap is
 * layout-free.
 */
export function SkeletonReveal({
  loaded,
  skeleton,
  children,
  className = "",
}: {
  loaded: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (loaded) {
      el.classList.add("is-revealed");
    } else {
      el.classList.remove("is-revealed");
    }
  }, [loaded]);

  return (
    <div ref={ref} className={`t-skel ${className}`}>
      <div className={`t-skel-skeleton is-pulsing`}>{skeleton}</div>
      <div className="t-skel-content">{children}</div>
    </div>
  );
}

/**
 * Error-state shake. Call `trigger()` to replay the shake + show the message;
 * it auto-reverts after --revert-hold. Typing into the wrapped input cancels
 * the revert early.
 */
export function useErrorShake() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = (message?: string) => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    if (!wrap || !input) return;
    wrap.classList.add("is-error");
    input.classList.add("is-error");
    if (message) {
      const msg = wrap.querySelector(".t-error-msg");
      if (msg) msg.textContent = message;
    }
    input.classList.remove("is-shaking");
    void input.offsetWidth;
    input.classList.add("is-shaking");

    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const shakeMs = num("--shake-dur-a", 80) * 2 + num("--shake-dur-b", 60) * 2;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      wrap.classList.remove("is-error");
      input.classList.remove("is-error");
    }, shakeMs + num("--revert-hold", 3000));
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    wrapRef.current?.classList.remove("is-error");
    inputRef.current?.classList.remove("is-error");
  };

  return { wrapRef, inputRef, trigger, clear };
}

/** Accordion disclosure — height animates via grid-rows, chevron flips. */
export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="t-acc border border-border" data-open={String(open)}>
      <button
        type="button"
        className="t-acc-head w-full flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.12em] hover:bg-accent transition-colors"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{title}</span>
        <span className="t-acc-chevron">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.5L8 10.5L12 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner px-4 py-4 border-t border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
